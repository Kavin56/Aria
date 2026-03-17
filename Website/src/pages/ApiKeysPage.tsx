import { ReactNode } from "react";

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
            <button className="icon-btn" type="button" aria-label="Create">
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
              <button className="primary-btn" type="button">
                <span className="btn-plus">+</span>
                Create API key
              </button>
            </div>
          </div>

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
                <div className="tr">
                  <div className="td">
                    <div className="key">
                      <span className="key-mask">…u2v1</span>
                      <div className="sub">Generative Language API Key</div>
                    </div>
                  </div>
                  <div className="td">
                    <div className="link">neww</div>
                    <div className="sub">gen-lang-client-0565463856</div>
                  </div>
                  <div className="td">Oct 12, 2025</div>
                  <div className="td">
                    <div className="link">Set up billing</div>
                    <div className="sub">Free tier</div>
                  </div>
                  <div className="td td-actions">
                    <button className="icon-btn small" type="button" aria-label="Copy">
                      <Icon size={16}>
                        <path
                          d="M9 9h10v10H9V9ZM5 5h10v2H7v8H5V5Z"
                          fill="currentColor"
                        />
                      </Icon>
                    </button>
                    <button className="icon-btn small" type="button" aria-label="View">
                      <Icon size={16}>
                        <path
                          d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                          fill="currentColor"
                        />
                      </Icon>
                    </button>
                    <button className="icon-btn small" type="button" aria-label="More">
                      <Icon size={16}>
                        <path
                          d="M12 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                          fill="currentColor"
                        />
                      </Icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="empty">
              <div className="empty-icon" aria-hidden="true">
                <div className="diamond" />
              </div>
              <h2 className="empty-title">Can’t find your API keys here?</h2>
              <p className="empty-text">
                This list only shows API keys for projects imported into Google AI
                Studio. Import other projects to manage their associated API keys.
                You can also create a new API key above.
                <span className="empty-link"> Learn more</span>
              </p>
              <button className="primary-btn subtle" type="button">
                Import projects
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

