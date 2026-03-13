import { For, Show, createSignal } from "solid-js";
import { BookOpen, Zap, Settings, MessageCircle, Box, Activity, Clock } from "lucide-solid";

export default function DocumentsView() {
  const [selectedSection, setSelectedSection] = createSignal<string>("getting-started");

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      content: [
        {
          heading: "Welcome to SHIFT",
          text: "SHIFT is a powerful desktop application that helps you automate tasks, manage agents, and run scheduled workflows. This guide will walk you through everything you need to know.",
        },
        {
          heading: "First Steps",
          steps: [
            "Launch the SHIFT application on your computer",
            "You'll see the Mission Control dashboard showing your system status",
            "Navigate through the sidebar to explore different sections",
            "Start by creating your first workspace or connecting to an existing one",
          ],
        },
        {
          heading: "Understanding the Interface",
          text: "The main interface consists of:\n- Left Sidebar: Workspace and session management\n- Main Content Area: Current view (Mission Control, Automations, Skills, etc.)\n- Right Sidebar: Navigation between different sections\n- Status Bar: System status and quick actions",
        },
      ],
    },
    {
      id: "mission-control",
      title: "Mission Control",
      icon: Activity,
      content: [
        {
          heading: "Overview",
          text: "Mission Control is your central dashboard for monitoring all system activity. It provides real-time information about your agents, workers, and tasks.",
        },
        {
          heading: "Key Metrics",
          items: [
            "Total Agents: Shows the number of active agents in your system",
            "Token Usage: Displays total token consumption across all sessions",
            "Active Workers: Number of online workers/workspaces",
            "Node Cluster: Current cluster status and name",
          ],
        },
        {
          heading: "Status Cards",
          items: [
            "Working: Shows agents currently processing tasks",
            "Waiting: Displays tasks queued for execution",
            "Permissions: Lists pending permission requests",
            "Completed: Shows finished tasks",
          ],
        },
        {
          heading: "Using Mission Control",
          steps: [
            "Click on any waiting task to open it in the session view",
            "Use the Refresh button to update all metrics",
            "Monitor the Operational status badge to ensure system health",
            "Check permissions card to approve or deny pending requests",
          ],
        },
      ],
    },
    {
      id: "automations",
      title: "Automations",
      icon: Clock,
      content: [
        {
          heading: "What are Automations?",
          text: "Automations are scheduled tasks that run automatically at specified times. They can execute prompts, run commands, or trigger workflows without manual intervention.",
        },
        {
          heading: "Creating an Automation",
          steps: [
            "Navigate to the Automations tab in the sidebar",
            "Click the 'Create Automation' button",
            "Enter a name and description for your automation",
            "Set the schedule (daily, weekly, or custom cron expression)",
            "Configure what the automation should do (prompt, command, etc.)",
            "Save the automation",
          ],
        },
        {
          heading: "Schedule Formats",
          text: "You can use:\n- Simple schedules: 'Every hour', 'Daily at 9 AM', 'Every Monday'\n- Cron expressions: For advanced scheduling (e.g., '0 9 * * 1-5' for weekdays at 9 AM)\n- Relative times: 'Every 2 hours', 'Every 30 minutes'",
        },
        {
          heading: "Managing Automations",
          items: [
            "View all automations in the Automations tab",
            "Click on an automation to see its details and run history",
            "Edit or delete automations using the action buttons",
            "Monitor last run status and any errors",
          ],
        },
        {
          heading: "Windows Support",
          text: "Automations are now fully supported on Windows! You can create and manage scheduled tasks just like on macOS and Linux. The system uses Windows Task Scheduler under the hood.",
        },
      ],
    },
    {
      id: "skills",
      title: "Skills",
      icon: Zap,
      content: [
        {
          heading: "What are Skills?",
          text: "Skills are reusable prompt templates and workflows that can be triggered by name. They help you standardize common tasks and make them easily accessible.",
        },
        {
          heading: "Creating a Skill",
          steps: [
            "Go to the Skills tab",
            "Click 'Create Skill' or 'Import Skill'",
            "Enter a name and description",
            "Write the skill content (prompt or workflow)",
            "Optionally set a trigger phrase",
            "Save the skill",
          ],
        },
        {
          heading: "Using Skills",
          steps: [
            "In any session, type the skill name or trigger phrase",
            "The skill will be automatically applied",
            "You can also browse and select skills from the Skills tab",
            "Skills can be shared across workspaces",
          ],
        },
        {
          heading: "Skill Management",
          items: [
            "View all installed skills in the Skills tab",
            "Edit skills to update their content",
            "Delete skills you no longer need",
            "Import skills from the Hub or local files",
            "Export skills to share with others",
          ],
        },
      ],
    },
    {
      id: "extensions",
      title: "Extensions & MCP",
      icon: Box,
      content: [
        {
          heading: "What are Extensions?",
          text: "Extensions add functionality to SHIFT through plugins and MCP (Model Context Protocol) servers. They enable integrations with external services and tools.",
        },
        {
          heading: "Installing Plugins",
          steps: [
            "Navigate to the Extensions tab",
            "Go to the Plugins section",
            "Click 'Add Plugin'",
            "Enter the plugin name (e.g., 'npm', 'git')",
            "Follow any installation prompts",
            "The plugin will be available in your sessions",
          ],
        },
        {
          heading: "Connecting MCP Servers",
          steps: [
            "Go to the MCP section in Extensions",
            "Click 'Connect MCP Server'",
            "Choose from quick connect options or add a custom server",
            "Configure authentication if required",
            "Authorize the connection when prompted",
            "The MCP server will be available for use",
          ],
        },
        {
          heading: "Managing Extensions",
          items: [
            "View plugin and MCP status in the Extensions tab",
            "Enable or disable extensions as needed",
            "Configure extension settings",
            "Remove extensions you no longer use",
            "Check for updates and new extensions",
          ],
        },
      ],
    },
    {
      id: "messaging",
      title: "Messaging & Identities",
      icon: MessageCircle,
      content: [
        {
          heading: "Setting Up Messaging",
          text: "SHIFT can connect to messaging platforms like Slack and Telegram, allowing you to interact with agents through these channels.",
        },
        {
          heading: "Connecting Slack",
          steps: [
            "Go to the Messaging (IDs) tab",
            "Click 'Connect Slack'",
            "Follow the OAuth flow to authorize SHIFT",
            "Select the workspace and channels",
            "Start receiving and sending messages through Slack",
          ],
        },
        {
          heading: "Connecting Telegram",
          steps: [
            "Navigate to the Messaging tab",
            "Click 'Connect Telegram'",
            "Follow the bot setup instructions",
            "Start a chat with your Telegram bot",
            "Interact with agents through Telegram",
          ],
        },
        {
          heading: "Managing Identities",
          items: [
            "View all connected messaging platforms",
            "Configure bot settings and permissions",
            "Monitor message activity",
            "Disconnect platforms when needed",
          ],
        },
      ],
    },
    {
      id: "sessions",
      title: "Working with Sessions",
      icon: BookOpen,
      content: [
        {
          heading: "What are Sessions?",
          text: "Sessions are conversations with agents where you can send prompts, run commands, and execute tasks. Each session maintains its own context and history.",
        },
        {
          heading: "Creating a Session",
          steps: [
            "Click 'New Task' or 'Create Session'",
            "Enter your prompt or question",
            "Select an agent if needed",
            "Choose a model (if you have multiple providers)",
            "Send the prompt",
          ],
        },
        {
          heading: "Session Features",
          items: [
            "Send text prompts and questions",
            "Attach files to provide context",
            "Run commands and execute code",
            "View execution steps and results",
            "Review message history",
            "Export session data",
          ],
        },
        {
          heading: "Managing Sessions",
          items: [
            "View all sessions in the left sidebar",
            "Switch between sessions easily",
            "Rename sessions for better organization",
            "Delete sessions you no longer need",
            "Search through session history",
          ],
        },
        {
          heading: "Session Best Practices",
          items: [
            "Use clear, specific prompts for better results",
            "Break complex tasks into smaller sessions",
            "Review execution steps to understand agent actions",
            "Approve permissions carefully",
            "Save important sessions for reference",
          ],
        },
      ],
    },
    {
      id: "settings",
      title: "Settings & Configuration",
      icon: Settings,
      content: [
        {
          heading: "Accessing Settings",
          text: "Click the Settings icon in the status bar or navigate to Settings in the sidebar to configure your SHIFT installation.",
        },
        {
          heading: "General Settings",
          items: [
            "Startup preference (local or server mode)",
            "Theme settings (light, dark, or system)",
            "Language preferences",
            "Update settings",
          ],
        },
        {
          heading: "Model Configuration",
          items: [
            "Connect AI providers (OpenAI, Anthropic, OpenRouter, etc.)",
            "Set default models",
            "Configure API keys",
            "Manage model variants",
          ],
        },
        {
          heading: "Advanced Settings",
          items: [
            "Developer mode options",
            "Engine runtime configuration",
            "Workspace settings",
            "Debug options",
          ],
        },
        {
          heading: "Workspace Management",
          steps: [
            "Create new local or remote workspaces",
            "Switch between workspaces",
            "Configure workspace settings",
            "Export or import workspace configurations",
            "Share workspaces with others",
          ],
        },
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: Settings,
      content: [
        {
          heading: "Common Issues",
          items: [
            "Connection problems: Check your network and server status",
            "Permission errors: Review and approve pending permissions",
            "Model errors: Verify API keys and provider status",
            "Scheduler issues: Ensure scheduler is installed and running",
          ],
        },
        {
          heading: "Getting Help",
          items: [
            "Check the status bar for system health indicators",
            "Review error messages in the UI",
            "Check logs in developer mode",
            "Visit the SHIFT documentation",
            "Report issues on GitHub",
          ],
        },
        {
          heading: "System Requirements",
          items: [
            "Windows 10/11, macOS 10.15+, or Linux",
            "Internet connection for remote features",
            "Sufficient disk space for workspaces",
            "Administrator/root access for scheduler (local automations)",
          ],
        },
      ],
    },
  ];

  const selectedSectionData = () => sections.find((s) => s.id === selectedSection()) ?? sections[0];

  return (
    <div class="flex h-full">
      {/* Left Sidebar - Icons Only */}
      <aside class="w-20 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex flex-col items-center py-4 space-y-3">
        <For each={sections}>
          {(section) => {
            const Icon = section.icon;
            const isSelected = () => selectedSection() === section.id;
            return (
              <button
                type="button"
                onClick={() => setSelectedSection(section.id)}
                class={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                  isSelected()
                    ? "bg-gray-100 text-gray-900 border border-gray-300"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={section.title}
              >
                <Icon size={24} />
              </button>
            );
          }}
        </For>
      </aside>

      {/* Right Content Area */}
      <main class="flex-1 overflow-y-auto bg-white dark:bg-black">
        <div class="max-w-4xl mx-auto p-8">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-2">
              {(() => {
                const Icon = selectedSectionData().icon;
                return <Icon size={28} class="text-gray-600" />;
              })()}
              <h1 class="text-3xl font-semibold text-black dark:text-white">{selectedSectionData().title}</h1>
            </div>
            <div class="text-gray-600 text-sm">
              Complete guide to using SHIFT. Learn how to set up, configure, and get the most out of your automation platform.
            </div>
          </div>

          <div class="space-y-6">
            <For each={selectedSectionData().content}>
              {(item) => (
                <div class="rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                  <div class="space-y-3">
                    <Show when={item.heading}>
                      <h3 class="text-xl font-semibold text-black dark:text-white">{item.heading}</h3>
                    </Show>
                    <Show when={item.text}>
                      <p class="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{item.text}</p>
                    </Show>
                    <Show when={item.steps}>
                      <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600 ml-2">
                        <For each={item.steps}>
                          {(step) => <li class="leading-relaxed">{step}</li>}
                        </For>
                      </ol>
                    </Show>
                    <Show when={item.items}>
                      <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 ml-2">
                        <For each={item.items}>
                          {(item) => <li class="leading-relaxed">{item}</li>}
                        </For>
                      </ul>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div class="rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-sm p-6 mt-8">
            <h3 class="text-lg font-semibold text-black dark:text-white mb-2">Need More Help?</h3>
            <p class="text-sm text-gray-600">
              For additional support, visit the SHIFT documentation website or check the GitHub repository for the latest updates and community discussions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
