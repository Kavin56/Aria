import { createClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type SavedWorker = { url: string; key: string };

export function WorkersPage() {
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

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SavedWorker | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sha256Hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function makeKey(): string {
    // URL-safe random key; this is what the desktop user pastes.
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function createWorker() {
    setBusy(true);
    setSaved(null);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase env is not configured on this website.");
      if (!runpodBaseUrl) throw new Error("RunPod worker URL is not configured.");

      // Thread URL: in this simplified model it's the base OpenWork URL you share.
      // (No RunPod changes; no per-user workspace provisioning.)
      const url = runpodBaseUrl;
      const key = makeKey();
      const keyHash = await sha256Hex(key);

      const { error } = await supabase.from("swift_keys").insert({
        url,
        key_hash: keyHash,
      });
      if (error) throw new Error(error.message);

      setSaved({ url, key });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-top">
          <div className="sb-home">
            <span className="sb-home-dot" aria-hidden="true" />
            <span className="sb-home-label">Swift Cloud</span>
          </div>
        </div>

        <nav className="sb-nav" aria-label="Primary">
          <Link className="sb-item" to="/api-keys">
            <span className="sb-label">API keys</span>
          </Link>
          <Link className="sb-item is-active" to="/workers">
            <span className="sb-label">Remote workers</span>
          </Link>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="crumb">
              <span>Remote workers</span>
            </div>
          </div>
        </header>

        <div className="page">
          <div className="page-head">
            <h1 className="page-title">Remote workers</h1>
            <div className="page-actions">
              <button className="primary-btn" type="button" onClick={createWorker} disabled={busy}>
                {busy ? "Creating..." : "Create worker"}
              </button>
            </div>
          </div>

          <section className="card">
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                RunPod worker URL: <code>{runpodBaseUrl}</code>
              </div>

              {!saved ? (
                <div style={{ marginTop: 12, opacity: 0.85 }}>
                  Click “Create worker” to generate a thread URL + Swift key (saved in Supabase).
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>URL</div>
                    <code style={{ display: "block", padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
                      {saved.url}
                    </code>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Swift key</div>
                    <code style={{ display: "block", padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
                      {saved.key}
                    </code>
                  </div>
                </div>
              )}

              {error ? <div style={{ marginTop: 12, color: "#FF9B9B" }}>{error}</div> : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

