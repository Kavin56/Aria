import { For, Show, createMemo, createSignal, onMount, onCleanup } from "solid-js";
import { CheckCircle, Clock, Play, AlertCircle, RefreshCw, Loader2, Power } from "lucide-solid";
import { homeDir } from "@tauri-apps/api/path";
import { isTauriRuntime } from "../utils";
import type { Agent, Session } from "@opencode-ai/sdk/v2/client";
import type { WorkspaceSessionGroup, PendingPermission } from "../types";
import type { WorkspaceInfo, OrchestratorStatus } from "../lib/tauri";
import type { OpenworkServerStatus } from "../lib/openwork-server";

export type MissionControlViewProps = {
  workspaceSessionGroups: WorkspaceSessionGroup[];
  pendingPermissions: PendingPermission[] | unknown;
  listAgents: () => Promise<Agent[]>;
  workspaces: WorkspaceInfo[];
  clientConnected: boolean;
  openworkServerStatus: OpenworkServerStatus;
  orchestratorStatus: OrchestratorStatus | null;
  refreshPendingPermissions: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void> | void;
  setView: (view: "session", sessionId?: string) => void;
  startHost?: () => Promise<boolean>;
  activeWorkspacePath?: () => string;
};

export default function MissionControlView(props: MissionControlViewProps) {
  const [agents, setAgents] = createSignal<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = createSignal(false);
  const [lastRefresh, setLastRefresh] = createSignal(Date.now());
  const [refreshing, setRefreshing] = createSignal(false);

  // Get all sessions from workspace groups
  const allSessions = createMemo(() => {
    const sessions: Array<{ session: { id: string; title?: string; slug?: string }; workspace: WorkspaceInfo }> = [];
    for (const group of props.workspaceSessionGroups) {
      for (const session of group.sessions) {
        sessions.push({
          session: { id: session.id, title: session.title, slug: session.slug ?? undefined },
          workspace: group.workspace,
        });
      }
    }
    return sessions;
  });

  // Calculate metrics
  const totalAgents = createMemo(() => agents().length);
  
  const tokenUsage = createMemo(() => {
    // Calculate token usage from sessions (simplified - would need message data for accurate count)
    // For now, return a placeholder that could be enhanced with actual token tracking
    return 0;
  });

  const activeWorkers = createMemo(() => {
    return props.workspaces.filter((ws) => {
      // Check if workspace has active sessions
      return allSessions().some((s) => {
        const group = props.workspaceSessionGroups.find((g) => 
          g.sessions.some((gs) => gs.id === s.session.id)
        );
        return group?.workspace.id === ws.id;
      });
    }).length;
  });

  const nodeCluster = createMemo(() => {
    // Fallback to first workspace name or default
    const firstWorkspace = props.workspaces[0];
    return firstWorkspace?.displayName ?? firstWorkspace?.name ?? "LOCAL";
  });

  const nodeClusterStatus = createMemo(() => {
    if (!props.clientConnected) return "Offline";
    if (props.openworkServerStatus === "connected") return "Online";
    return "Online"; // Default to online if connected
  });

  // Categorize sessions by status
  const workingSessions = createMemo(() => {
    // Sessions that are actively processing (would need session status tracking)
    // For now, return empty - this would need integration with session status
    return [];
  });

  const waitingSessions = createMemo(() => {
    // Sessions that are queued or waiting
    // Return recent sessions as "waiting" for demo purposes
    return allSessions()
      .slice(0, 2)
      .map((s) => ({
        id: s.session.id,
        title: s.session.title || s.session.slug || "Untitled",
        workspace: s.workspace.displayName || s.workspace.name || "Cloud Worker",
      }));
  });

  const pendingPermissionsList = createMemo(() => {
    if (Array.isArray(props.pendingPermissions)) {
      return props.pendingPermissions as PendingPermission[];
    }
    return [];
  });

  const completedSessions = createMemo(() => {
    // Sessions that have been completed (would need completion tracking)
    return [];
  });

  const metrics = createMemo(() => [
    { label: "TOTAL AGENTS", value: String(totalAgents()), subtitle: totalAgents() === 1 ? "active" : "active" },
    { label: "TOKEN USAGE", value: String(tokenUsage()), subtitle: "Total" },
    { label: "ACTIVE WORKERS", value: String(activeWorkers()), subtitle: "Online" },
    { label: "NODE CLUSTER", value: nodeCluster(), subtitle: nodeClusterStatus() },
  ]);

  const statusCards = createMemo(() => [
    {
      label: "Working",
      count: workingSessions().length,
      message: "No agents working",
      icon: Play,
      items: [],
    },
    {
      label: "Waiting",
      count: waitingSessions().length,
      message: "",
      icon: Clock,
      items: waitingSessions().map((s) => ({
        id: s.id,
        text: s.title.length > 25 ? s.title.substring(0, 22) + "..." : s.title,
        type: s.workspace,
      })),
    },
    {
      label: "Permissions",
      count: pendingPermissionsList().length,
      message: "No pending permissions",
      icon: AlertCircle,
      items: [],
    },
    {
      label: "Completed",
      count: completedSessions().length,
      message: "No completed tasks",
      icon: CheckCircle,
      items: [],
    },
  ]);

  const loadAgents = async () => {
    setAgentsLoading(true);
    try {
      const list = await props.listAgents();
      setAgents(list);
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setAgentsLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    setLastRefresh(Date.now());
    try {
      await Promise.all([
        loadAgents(),
        props.refreshPendingPermissions(),
      ]);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh interval
  let refreshInterval: number | undefined;
  onMount(() => {
    loadAgents();
    refreshInterval = window.setInterval(() => {
      loadAgents();
      props.refreshPendingPermissions();
    }, 10000); // Refresh every 10 seconds
  });

  onCleanup(() => {
    if (refreshInterval) {
      window.clearInterval(refreshInterval);
    }
  });

  const handleSessionClick = async (sessionId: string) => {
    await props.selectSession(sessionId);
    props.setView("session", sessionId);
  };

  const [connecting, setConnecting] = createSignal(false);

  const operationalStatus = createMemo(() => {
    if (!props.clientConnected) return { label: "OFFLINE", color: "bg-red-1 text-red-11 border-red-7/20" };
    return { label: "OPERATIONAL", color: "bg-green-1 text-green-11 border-green-7/20" };
  });

  const handleConnect = async () => {
    if (!props.startHost || !isTauriRuntime()) return;
    setConnecting(true);
    try {
      const workspacePath = props.activeWorkspacePath?.()?.trim();
      let pathToUse = workspacePath;
      
      if (!pathToUse) {
        try {
          pathToUse = (await homeDir()).replace(/[\\/]+$/, "");
        } catch {
          // If we can't get home dir, just try without a path
        }
      }
      
      if (pathToUse) {
        const ok = await props.startHost({ workspacePath: pathToUse });
        if (ok) {
          // Refresh after connection
          await refresh();
        }
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-semibold text-black dark:text-white">Mission Control</h1>
          <span class={`px-3 py-1 rounded-full ${operationalStatus().color} text-xs font-medium border`}>
            {operationalStatus().label}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Show when={!props.clientConnected && props.startHost && isTauriRuntime()}>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting()}
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 border border-blue-600 dark:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Connect to backend"
            >
              <Power size={16} class={connecting() ? "animate-pulse" : ""} />
              {connecting() ? "Connecting..." : "Connect"}
            </button>
          </Show>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing()}
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw size={16} class={refreshing() ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Row - Metrics */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <For each={metrics()}>
          {(metric) => (
            <div class="rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{metric.label}</div>
              <div class="text-2xl font-semibold text-black dark:text-white">{metric.value}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">{metric.subtitle}</div>
            </div>
          )}
        </For>
      </div>

      {/* Bottom Row - Status Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <For each={statusCards()}>
          {(card) => {
            const Icon = card.icon;
            return (
              <div class="rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-2 mb-3">
                  <Icon size={18} class="text-gray-600 dark:text-gray-400" />
                  <div class="text-xs font-medium text-gray-600 dark:text-gray-400">{card.label}</div>
                </div>
                <div class="text-2xl font-semibold text-black dark:text-white mb-2">{card.count}</div>
                <Show when={card.items.length > 0} fallback={<div class="text-xs text-gray-600 dark:text-gray-400">{card.message}</div>}>
                  <div class="space-y-2">
                    <For each={card.items}>
                      {(item) => (
                        <button
                          type="button"
                          onClick={() => "id" in item && handleSessionClick(item.id)}
                          class="w-full text-left rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div class="text-xs text-black dark:text-white mb-1">{item.text}</div>
                          <div class="text-xs text-gray-600 dark:text-gray-400">{item.type}</div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Last refresh time */}
      <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date(lastRefresh()).toLocaleTimeString()}
      </div>
    </div>
  );
}
