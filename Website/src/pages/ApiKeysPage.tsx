import { createClient } from "@supabase/supabase-js";
import { ReactNode, useMemo, useState } from "react";

type LocalApiKey = {
  id: string;
  createdAt: number;
  label: string;
  project: string;
  keyHash: string;
  masked: string;
};

const LOCAL_KEYS_STORAGE = "swift.apiKeys.v1";

function Icon({
  children,
  size = 18
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-flex" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {children}
      </svg>
    </span>
  );
}

function SidebarItem({
  active,
  icon,
  children
}: {
  active?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      className={`sb-item ${active ? "is-active" : ""}`}
      type="button"
    >
      <span className="sb-icon">{icon}</span>
      <span className="sb-label">{children}</span>
    </button>
  );
}

export function ApiKeysPage() {
  const runpodBaseUrl = useMemo(() => {
    const raw =
      (import.meta as any).env?.VITE_SWIFT_RUNPOD_WORKER_URL ||
      "https://unameliorative-regretably-kimberly.ngrok-free.dev";
    return String(raw).trim().replace(/\/+$/, "");
  }, []);

  const supabaseUrl = ((import.meta as any).env?.VITE_SWIFT_SUPABASE_URL || "").trim();
  const supabaseAnonKey = ((import.meta as any).env?.VITE_SWIFT_SUPABASE_ANON_KEY || "").trim();
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, [supabaseUrl, supabaseAnonKey]);

  const [workerBusy, setWorkerBusy] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerBundle, setWorkerBundle] = useState<{ url: string; key: string } | null>(null);

  const [apiKeys, setApiKeys] = useState<LocalApiKey[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEYS_STORAGE);
      const parsed = raw ? (JSON.parse(raw) as LocalApiKey[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [createKeyBusy, setCreateKeyBusy] = useState(false);
  const [createKeyError, setCreateKeyError] = useState<string | null>(null);
  const [createKeyProject, setCreateKeyProject] = useState("neww");
  const [createKeyLabel, setCreateKeyLabel] = useState("Swift API Key");
  const [createdPlaintextKey, setCreatedPlaintextKey] = useState<string | null>(null);

  const persistKeys = (next: LocalApiKey[]) => {
    setApiKeys(next);
    try {
      localStorage.setItem(LOCAL_KEYS_STORAGE, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  async function sha256Hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function randomId(bytes = 8): string {
    const buf = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function makeKey(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function formatDate(ts: number): string {
    try {
      return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return new Date(ts).toDateString();
    }
  }

  async function createApiKey() {
    setCreateKeyBusy(true);
    setCreateKeyError(null);
    setCreatedPlaintextKey(null);
    try {
      if (!supabase) throw new Error("Supabase env is not configured on this website.");

      const plaintext = `swift_${makeKey()}`;
      const keyHash = await sha256Hex(plaintext);
      const last4 = plaintext.slice(-4);
      const masked = `…${last4}`;

      const project = createKeyProject.trim() || "default";
      const label = createKeyLabel.trim() || "Swift API Key";

      const { error } = await supabase.from("swift_api_keys").insert({
        project,
        label,
        key_hash: keyHash,
      });
      if (error) throw new Error(error.message);

      const item: LocalApiKey = {
        id: `key_${randomId(10)}`,
        createdAt: Date.now(),
        project,
        label,
        keyHash,
        masked,
      };
      persistKeys([item, ...apiKeys]);
      setCreatedPlaintextKey(plaintext);
    } catch (e) {
      setCreateKeyError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreateKeyBusy(false);
    }
  }

  async function revokeApiKey(item: LocalApiKey) {
    if (!supabase) return;
    const ok = confirm(`Revoke API key ${item.masked}?`);
    if (!ok) return;
    const { data, error } = await supabase.rpc("swift_revoke_api_key", { key_hash: item.keyHash });
    if (error) {
      alert(error.message);
      return;
    }
    if (!data) {
      alert("Key not found (already revoked?).");
    }
    persistKeys(apiKeys.filter((k) => k.id !== item.id));
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  async function createRemoteWorkerKey() {
    setWorkerBusy(true);
    setWorkerError(null);
    setWorkerBundle(null);
    try {
      if (!supabase) throw new Error("Supabase env is not configured on this website.");
      if (!runpodBaseUrl) throw new Error("RunPod worker URL is not configured.");
      const url = runpodBaseUrl;
      const key = makeKey();
      const keyHash = await sha256Hex(key);

      const { error } = await supabase.from("swift_keys").insert({ url, key_hash: keyHash });
      if (error) throw new Error(error.message);

      setWorkerBundle({ url, key });
    } catch (e) {
      setWorkerError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorkerBusy(false);
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-top">
          <div className="sb-home">
            <span className="sb-home-dot" aria-hidden="true" />
            <span className="sb-home-label">Dashboard</span>
          </div>
        </div>

        <nav className="sb-nav" aria-label="Primary">
          <SidebarItem
            active
            icon={
              <Icon>
                <path
                  d="M7 12h10M7 16h6M8.5 3.5h7L19 7v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </Icon>
            }
          >
            API keys
          </SidebarItem>
          <SidebarItem
            icon={
              <Icon>
                <path
                  d="M4 7.5h16M7.5 4h9M6 20h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </Icon>
            }
          >
            Projects
          </SidebarItem>
          <SidebarItem
            icon={
              <Icon>
                <path
                  d="M7 17h10M8 7h8M6.5 3.5h11A2.5 2.5 0 0 1 20 6v12a2.5 2.5 0 0 1-2.5 2h-11A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </Icon>
            }
          >
            Usage and Billing
          </SidebarItem>
          <SidebarItem
            icon={
              <Icon>
                <path
                  d="M6 20h12M8 20V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v15"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </Icon>
            }
          >
            Logs and Datasets
          </SidebarItem>
          <SidebarItem
            icon={
              <Icon>
                <path
                  d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </Icon>
            }
          >
            Settings
          </SidebarItem>
        </nav>

        <div className="sb-bottom">
          <div className="sb-pill">Let it snow</div>
          <button className="sb-link" type="button">
            Get API key
          </button>
          <button className="sb-link" type="button">
            Settings
          </button>
          <div className="sb-user">
            <div className="sb-avatar" aria-hidden="true">
              T
            </div>
            <div className="sb-user-text">
              <div className="sb-user-email">talamanda02@gmail…</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="crumb">
              <span className="crumb-back" aria-hidden="true">
                ‹
              </span>
              <span>Dashboard</span>
            </div>
          </div>
          <div className="topbar-right" aria-label="Actions">
            <button className="icon-btn" type="button" aria-label="Apps">
              <Icon>
                <path
                  d="M6 6h4v4H6V6Zm8 0h4v4h-4V6ZM6 14h4v4H6v-4Zm8 0h4v4h-4v-4Z"
                  fill="currentColor"
                />
              </Icon>
            </button>
            <button className="icon-btn" type="button" aria-label="Create" onClick={() => setCreateKeyOpen(true)}>
              <span className="pill-plus">+</span>
              <span className="pill-text">Create API key</span>
            </button>
          </div>
        </header>

        <div className="page">
          <div className="page-head">
            <h1 className="page-title">API Keys</h1>
            <div className="page-actions">
              <button className="ghost-btn" type="button">
                API quickstart
              </button>
              <button className="primary-btn" type="button" onClick={() => setCreateKeyOpen(true)}>
                <span className="btn-plus">+</span>
                Create API key
              </button>
            </div>
          </div>

          <section className="card" aria-label="Remote worker key">
            <div className="card-toolbar">
              <div className="segmented" role="tablist" aria-label="Remote worker">
                <span className="seg-label">Remote worker</span>
                <button className="seg-btn is-on" type="button">
                  URL + Swift key
                </button>
              </div>
              <div className="filter">
                <button
                  className="primary-btn subtle"
                  type="button"
                  onClick={createRemoteWorkerKey}
                  disabled={workerBusy}
                >
                  {workerBusy ? "Generating..." : "Generate URL + key"}
                </button>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Worker URL: <code>{runpodBaseUrl}</code>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                Paste the URL + key into the OpenWork desktop app “Connect remote”. It will validate with Supabase.
              </div>

              {workerError ? (
                <div style={{ marginTop: 12, color: "#FF9B9B" }}>{workerError}</div>
              ) : null}

              {workerBundle ? (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>URL</div>
                    <code
                      style={{
                        display: "block",
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      {workerBundle.url}
                    </code>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Swift key</div>
                    <code
                      style={{
                        display: "block",
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      {workerBundle.key}
                    </code>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="card" aria-label="API keys table">
            <div className="card-toolbar">
              <div className="segmented" role="tablist" aria-label="Group by">
                <span className="seg-label">Group by</span>
                <button className="seg-btn is-on" type="button">
                  API key
                </button>
                <button className="seg-btn" type="button">
                  Project
                </button>
              </div>
              <div className="filter">
                <span className="filter-label">Filter by</span>
                <button className="select" type="button">
                  All projects <span aria-hidden="true">▾</span>
                </button>
              </div>
            </div>

            <div className="table">
              <div className="thead">
                <div className="th">Key</div>
                <div className="th">Project</div>
                <div className="th">Created on</div>
                <div className="th">Quota tier</div>
                <div className="th th-actions" />
              </div>

              <div className="tbody">
                {apiKeys.map((k) => (
                  <div className="tr" key={k.id}>
                    <div className="td">
                      <div className="key">
                        <span className="key-mask">{k.masked}</span>
                        <div className="sub">{k.label}</div>
                      </div>
                    </div>
                    <div className="td">
                      <div className="link">{k.project}</div>
                      <div className="sub">swift-client-{k.keyHash.slice(0, 10)}</div>
                    </div>
                    <div className="td">{formatDate(k.createdAt)}</div>
                    <div className="td">
                      <div className="link">Set up billing</div>
                      <div className="sub">Free tier</div>
                    </div>
                    <div className="td td-actions">
                      <button className="icon-btn small" type="button" aria-label="Copy masked" onClick={() => copyText(k.masked)}>
                        <Icon size={16}>
                          <path d="M9 9h10v10H9V9ZM5 5h10v2H7v8H5V5Z" fill="currentColor" />
                        </Icon>
                      </button>
                      <button
                        className="icon-btn small"
                        type="button"
                        aria-label="Revoke"
                        onClick={() => void revokeApiKey(k)}
                      >
                        <Icon size={16}>
                          <path
                            d="M7 6h10M10 6V5a2 2 0 0 1 4 0v1m-7 3v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                        </Icon>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {apiKeys.length === 0 ? (
              <div className="empty">
                <div className="empty-icon" aria-hidden="true">
                  <div className="diamond" />
                </div>
                <h2 className="empty-title">Can’t find your API keys here?</h2>
                <p className="empty-text">
                  This list shows API keys generated in this browser. Create a new API key above to get started.
                  <span className="empty-link"> Learn more</span>
                </p>
                <button className="primary-btn subtle" type="button" onClick={() => setCreateKeyOpen(true)}>
                  Create API key
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {createKeyOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="modal-title">Create API key</div>
                <div className="modal-sub">Generate an API key for your Swift project. You’ll only see it once.</div>
              </div>
              <button className="icon-btn small" type="button" aria-label="Close" onClick={() => setCreateKeyOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label className="field">
                <div className="field-label">Project</div>
                <input className="field-input" value={createKeyProject} onChange={(e) => setCreateKeyProject(e.target.value)} />
              </label>
              <label className="field">
                <div className="field-label">Label</div>
                <input className="field-input" value={createKeyLabel} onChange={(e) => setCreateKeyLabel(e.target.value)} />
              </label>

              {createKeyError ? <div className="alert">{createKeyError}</div> : null}

              {createdPlaintextKey ? (
                <div className="key-reveal">
                  <div className="field-label">Your API key</div>
                  <div className="key-row">
                    <code className="key-code">{createdPlaintextKey}</code>
                    <button className="primary-btn subtle" type="button" onClick={() => void copyText(createdPlaintextKey)}>
                      Copy
                    </button>
                  </div>
                  <div className="modal-sub">Store it somewhere safe. If you lose it, you’ll need to generate a new key.</div>
                </div>
              ) : null}
            </div>

            <div className="modal-foot">
              <button className="ghost-btn" type="button" onClick={() => setCreateKeyOpen(false)} disabled={createKeyBusy}>
                Done
              </button>
              <button className="primary-btn" type="button" onClick={() => void createApiKey()} disabled={createKeyBusy || Boolean(createdPlaintextKey)}>
                {createKeyBusy ? "Creating..." : "Create API key"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

