# Remote Worker: Technical Report

This document describes the **difference between local and remote workers**, how the **remote worker works and is connected**, and a **detailed technical reference** for server endpoints (`/token`, `/health`, `/status`, and others) and the request flow through ngrok.

---

## 1. Local vs Remote Worker: Differences

### 1.1 Definitions

| Aspect | Local worker | Remote worker |
|--------|--------------|---------------|
| **Workspace type** | `workspaceType: "local"` | `workspaceType: "remote"` |
| **Execution location** | OpenCode (and optionally OpenWork server) runs on the same machine as the app (desktop or browser host). | OpenCode and OpenWork server run on a remote host (e.g. RunPod); the app connects over the network (e.g. via ngrok). |
| **Base URL** | Typically `http://127.0.0.1:4096` (OpenCode) or `http://127.0.0.1:8787` (OpenWork server). | Public URL, e.g. `https://<ngrok-subdomain>.ngrok-free.dev`. |
| **Workspace path** | A real filesystem path on the client (e.g. `C:\Projects\myapp` or `/Users/me/project`). | Often a path on the remote host (e.g. `/workspace`); the app never touches the remote filesystem directly. |
| **Auth** | Optional OpenCode basic auth; OpenWork server may use env/cli tokens. | **Required**: client Bearer token from the remote OpenWork server (obtained via `GET /token` or pasted by user). |
| **OpenCode client** | Created with `baseUrl` = local OpenCode URL; no token for OpenCode. | Created with `baseUrl` = `{hostUrl}/w/{workspaceId}/opencode`; auth = `{ token, mode: "openwork" }`. |
| **API usage** | App may call OpenCode directly and/or OpenWork server on localhost. | All OpenCode traffic goes through the OpenWork server: app → ngrok → OpenWork server → OpenCode; OpenWork endpoints (workspaces, status, etc.) also via ngrok. |
| **Commands / FS** | App and server can list commands from `.opencode/commands` (local path). | For remote, the app and server **skip** local FS access for workspace root when it looks like a non-local path (e.g. Unix `/workspace` on Windows); command list may be from API or empty. |

### 1.2 Server-Side (OpenWork Server) Config

- **Local workspace** (in `server.json` or env): `path` = local path, `workspaceType: "local"`, `baseUrl` = OpenCode URL on that host (e.g. `http://127.0.0.1:4096`), `directory` optional.
- **Remote worker** (e.g. RunPod): The OpenWork server runs **on the remote host**. Its config has a workspace with `path` (e.g. `/workspace`), `workspaceType: "remote"` (or omitted, defaulting to local from server’s perspective), and `baseUrl` pointing to OpenCode on that host (e.g. `http://127.0.0.1:4096`). The server does not distinguish “local” vs “remote” by type for routing; it only needs a valid `workspace.id` and `workspace.baseUrl` to proxy OpenCode.

### 1.3 Client-Side (App) Model

- **Local**: Workspace has `path` (local dir), `workspaceType: "local"`. Connection is to local OpenCode (and optionally local OpenWork). No token required for OpenCode; OpenWork token may be used if using local server.
- **Remote**: Workspace has `workspaceType: "remote"`, `remoteType: "openwork"`, `openworkHostUrl`, `openworkToken`, `openworkWorkspaceId`, `baseUrl` (resolved OpenCode base, e.g. `https://ngrok.../w/ws_xxx/opencode`), `directory` (remote directory). Every OpenCode request uses the **Bearer token** (and optionally a live token getter so the latest token from settings is used on each request).

---

## 2. How the Remote Worker Is Connected

### 2.1 High-Level Flow

1. **User adds remote worker**  
   - Enters remote URL (e.g. ngrok: `https://xxx.ngrok-free.dev`) and optionally path (e.g. `/workspace`).  
   - App may auto-fetch token from `GET /token` (no auth) and store it in settings.

2. **Resolve host and workspace**  
   - App calls `resolveOpenworkHost({ hostUrl, token, workspaceId?, directoryHint? })`.  
   - It uses **OpenWork server API** with that token: `GET /health`, then `GET /workspaces`.  
   - Picks a workspace (by id, by directory hint, or first).  
   - Builds **OpenCode base URL**: `{hostUrl}/w/{workspaceId}/opencode` (e.g. `https://xxx.ngrok-free.dev/w/ws_c52ddf65534b/opencode`).

3. **Connect OpenCode client**  
   - App calls `connectToServer(opencodeBaseUrl, directory, context, auth)` with `context.workspaceType === "remote"` and `auth = { token, mode: "openwork" }`.  
   - A single OpenCode client is created with that base URL and auth; for remote, a **live token getter** (`getOpenworkAuthForConnect`) can be passed so each request (including `prompt_async`) uses the current token.

4. **All OpenCode traffic**  
   - Requests from the app (sessions, `prompt_async`, inbox, etc.) go to URLs like:  
     `https://ngrok.../w/ws_xxx/opencode/session/ses_yyy/prompt_async`.  
   - The OpenWork server (behind ngrok) receives these, validates **Bearer token**, resolves workspace by `ws_xxx`, then **proxies** to `workspace.baseUrl` (e.g. `http://127.0.0.1:4096/session/.../prompt_async`) and returns the response back through ngrok to the app.

So: **Frontend → ngrok → OpenWork server (auth + proxy) → OpenCode → response back through ngrok to frontend.**

### 2.2 URL and Workspace ID

- **Workspace ID** on the server is derived from the workspace path: `ws_` + first 12 hex chars of `SHA256(path)` (see `workspaceIdForPath` in `packages/server/src/workspaces.ts`).  
- The app learns this id from `GET /workspaces` (or from the URL if the user already had a mounted URL like `/w/ws_xxx`).  
- **Mount pattern**: `/w/:id/opencode/*` and `/w/:id/opencode-router/*`. So the “remote” base URL the app uses is always of the form `{host}/w/{workspaceId}/opencode`.

### 2.3 Auth and ngrok

- **Token**: Obtained once via `GET /token` (no auth), then sent on every request as `Authorization: Bearer <token>`.  
- **ngrok**: Browser or programmatic requests to ngrok URLs can get an HTML interstitial. The app sends the header **`ngrok-skip-browser-warning: 1`** on all requests to the ngrok host (OpenWork server client and OpenCode client) so the server returns the real API response.

### 2.4 Create Remote Workspace Flow (App)

- User fills “Create Worker” → Remote → host URL + path (e.g. `/workspace`).  
- If token is missing, app calls `fetchOpenworkTokenFromServer(hostUrl)` and persists it.  
- `resolveOpenworkHost` is called; on 401, app may fetch token again and retry once.  
- `connectToServer(opencodeBaseUrl, directory, { workspaceType: "remote", ... }, auth)` is called.  
- On success, a new workspace entry is stored (Tauri: `workspaceCreateRemote`, browser: in-memory workspace with `workspaceType: "remote"`, `openworkHostUrl`, `openworkToken`, `openworkWorkspaceId`, etc.).

### 2.5 Activate Existing Remote Workspace

- When switching to a remote OpenWork workspace, the app loads `openworkHostUrl` and token from the workspace (or settings).  
- If token is empty, it fetches from `GET /token`.  
- It calls `resolveOpenworkHost`; on 401, fetches token and retries once.  
- Then `connectToServer(resolved.opencodeBaseUrl, resolved.directory, { workspaceType: "remote", ... }, resolved.auth)`.

---

## 3. Server Endpoints: Technical Reference

The OpenWork server (`packages/server`) exposes the following. **Auth mode** is one of:

- **`none`**: No auth (e.g. health, token).
- **`client`**: `Authorization: Bearer <token>` with a valid **client** token (scope owner/collaborator/viewer).
- **`host`**: Either `X-OpenWork-Host-Token: <hostToken>` or `Authorization: Bearer <token>` with **owner** scope.

Token validation is done by `TokenService` (see `packages/server/src/tokens.ts`): client tokens can be the single `config.token` or entries in the token store (scoped tokens).

---

### 3.1 No-Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info: `{ service, version, health: "/health", uptimeMs }`. |
| GET | `/health` | **Health check.** Returns `{ ok: true, version, uptimeMs }`. Used by the app to verify the server is OpenWork and reachable (e.g. through ngrok). No auth. |
| GET | `/w/:id/health` | Same as `/health` but for workspace-mounted URL; same payload. No auth. |
| GET | `/token` | **Client token for remote workers.** Returns `{ token: config.token, source: config.tokenSource }`. No auth. The app uses this to get the Bearer token so the user does not have to open `/token` in a browser manually. |
| GET | `/w/:id/token` | Same as `/token`; same payload. No auth. |
| GET | `/ui` | Serves Toy UI HTML (if enabled). |
| GET | `/w/:id/ui` | Same for workspace-mounted base. |
| GET | `/ui/assets/*` | Toy UI static assets (CSS, JS, favicon). |
| OPTIONS | * | CORS preflight; 204 with appropriate CORS headers. |

---

### 3.2 Client-Auth Endpoints (Bearer token required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | **Full server diagnostics.** Returns `ok`, `version`, `uptimeMs`, `readOnly`, `approval`, `corsOrigins`, `workspaceCount`, `activeWorkspaceId`, `workspace` (active), `authorizedRoots`, `server`, `tokenSource`. Uses first workspace when no mount. |
| GET | `/w/:id/status` | **Status for one workspace.** Same shape; `workspace` is the workspace for `:id`. |
| GET | `/w/:id/capabilities` | Server capabilities (skills, plugins, mcp, proxy, etc.). |
| GET | `/capabilities` | Same, for default (first) workspace. |
| GET | `/workspaces` | List workspaces: `{ items, activeId }`. |
| GET | `/w/:id/workspaces` | List workspaces (single-item list for that id). |
| GET | `/whoami` | Returns `{ ok: true, actor }`. |
| GET | `/runtime/versions` | Runtime/orchestrator version snapshot. |
| GET | `/w/:id/runtime/versions` | Same. |
| POST | `/w/:id/runtime/upgrade` | Host-only (see below). |
| GET | `/workspace/:id/config` | Read workspace config (opencode + openwork). |
| PATCH | `/workspace/:id/config` | Update workspace config (client with collaborator scope). |
| GET | `/workspace/:id/audit` | Audit log for workspace. |
| DELETE | `/workspace/:id/sessions/:sessionId` | Delete a session (collaborator). |
| … | … | Many more workspace-scoped routes: events, engine/reload, inbox, artifacts, files/sessions, plugins, skills, mcp, commands, scheduler, agentlab, export/import, OpenCode Router (telegram, slack, bindings, send), etc. All require client auth and often collaborator scope. |

---

### 3.3 Host-Only Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/runtime/upgrade` | Trigger runtime upgrade. |
| POST | `/w/:id/runtime/upgrade` | Same for workspace. |
| GET | `/tokens` | List issued tokens (token store). |
| POST | `/tokens` | Create token; body `{ scope: "owner"|"collaborator"|"viewer", label? }`. |
| DELETE | `/tokens/:id` | Revoke token. |
| POST | `/workspaces/:id/activate` | Set active workspace. |
| DELETE | `/workspaces/:id` | Remove workspace from config. |
| POST | `/approvals/:id` | Reply to approval request (allow/deny). |

---

### 3.4 OpenCode Proxy (Client auth)

- **Mount form**: `/w/:id/opencode` or `/w/:id/opencode/*`.  
- **Behavior**:  
  - Request is matched by `parseWorkspaceMount(pathname)` → `workspaceId` + `restPath` (e.g. `restPath` = `/opencode` or `/opencode/session/.../prompt_async`).  
  - `requireClient(request, config, tokens)` enforces Bearer token.  
  - `resolveWorkspace(config, mount.workspaceId)` loads the workspace; `workspace.baseUrl` is the OpenCode base (e.g. `http://127.0.0.1:4096`).  
  - `proxyOpencodeRequest` builds the upstream URL: `baseUrl + (restPath with "/opencode" stripped)`, strips client headers (authorization, host, origin), sets `x-opencode-directory` from `workspace.directory` (or workspace path for local), and optionally sets `Authorization` for OpenCode (Basic auth from workspace `opencodeUsername`/`opencodePassword`).  
  - Server does a `fetch` to the OpenCode instance and returns the response (body and status) back.  
- So a request to `https://ngrok.../w/ws_xxx/opencode/session/ses_yyy/prompt_async` becomes a request to `http://127.0.0.1:4096/session/ses_yyy/prompt_async` on the remote host, and the response is streamed back.

### 3.5 OpenCode Router Proxy

- **Mount form**: `/w/:id/opencode-router` or `/w/:id/opencode-router/*`.  
- **Auth**: Some paths (e.g. `/opencode-router/health`, `/opencode-router/bindings`) require client (or host); others require host.  
- **Behavior**: Similar proxy to OpenCode Router service (e.g. `http://127.0.0.1:{OPENCODE_ROUTER_HEALTH_PORT}`), with path rewritten.

### 3.6 Unmounted OpenCode (single-workspace)

- If the server has only one workspace, requests to **`/opencode`** or **`/opencode/*`** (without `/w/:id`) are also handled: they use `config.workspaces[0]` and the same proxy logic. Same for `/opencode-router` without mount.

---

## 4. End-to-End Request Examples (Remote Worker)

### 4.1 Get token (no auth)

- **Request**: `GET https://xxx.ngrok-free.dev/token`  
- **Headers**: `ngrok-skip-browser-warning: 1`  
- **Response**: `200` `{ "token": "<client-token>", "source": "cli"|"env"|"file"|"generated" }`  
- **App**: Stores token in settings and uses it as Bearer for all subsequent requests.

### 4.2 Health check (no auth)

- **Request**: `GET https://xxx.ngrok-free.dev/health`  
- **Response**: `200` `{ "ok": true, "version": "...", "uptimeMs": ... }`  
- **App**: Used in `resolveOpenworkHost` to confirm the URL is an OpenWork server before calling `/workspaces`.

### 4.3 List workspaces (client auth)

- **Request**: `GET https://xxx.ngrok-free.dev/workspaces`  
- **Headers**: `Authorization: Bearer <token>`, `ngrok-skip-browser-warning: 1`  
- **Response**: `200` `{ "items": [ { "id": "ws_...", "name", "path", "workspaceType", "baseUrl", "directory", "opencode": { ... } } ], "activeId": "ws_..." }`  
- **App**: Picks workspace by id or directory hint, then builds OpenCode base URL as `{host}/w/{workspaceId}/opencode`.

### 4.4 Status (client auth)

- **Request**: `GET https://xxx.ngrok-free.dev/w/ws_xxx/status`  
- **Headers**: `Authorization: Bearer <token>`, `ngrok-skip-browser-warning: 1`  
- **Response**: `200` Same diagnostics shape as `/status`, with `workspace` for that id.

### 4.5 Prompt (OpenCode proxy, client auth)

- **Request**: `POST https://xxx.ngrok-free.dev/w/ws_xxx/opencode/session/ses_yyy/prompt_async` (body and headers as required by OpenCode API).  
- **Headers**: `Authorization: Bearer <token>`, `ngrok-skip-browser-warning: 1`, plus OpenCode-specific headers.  
- **Server**: Validates Bearer, resolves workspace `ws_xxx`, proxies to `workspace.baseUrl + /session/ses_yyy/prompt_async` (e.g. `http://127.0.0.1:4096/session/ses_yyy/prompt_async`), forwards body and relevant headers (e.g. `x-opencode-directory`), returns OpenCode response.  
- **App**: OpenCode client (with baseUrl `https://xxx.ngrok-free.dev/w/ws_xxx/opencode`) issues this request; the live token getter ensures the current token is sent.

---

## 5. RunPod / ngrok Setup (Summary)

- On the **remote host** (e.g. RunPod):  
  - OpenWork server listens on `0.0.0.0:8787`.  
  - OpenCode listens on `127.0.0.1:4096`.  
  - Workspace path e.g. `/workspace`; workspace id = `ws_` + 12-char hash of path.  
  - ngrok exposes port 8787 to a public URL (e.g. `https://xxx.ngrok-free.dev`).  
- **App**:  
  - Remote worker URL = ngrok URL.  
  - Token from `GET /token` (or manual).  
  - All OpenWork and OpenCode requests go to that URL with `Authorization: Bearer <token>` and `ngrok-skip-browser-warning: 1`.  
- **Flow**: Frontend → ngrok → OpenWork server (auth + proxy) → OpenCode → response back through ngrok to frontend.

### 5.1 Redeploying the server (CORS and fixes)

After changing server code (e.g. CORS in `packages/server/src/server.ts` to allow `ngrok-skip-browser-warning` in `Access-Control-Allow-Headers`), **redeploy and restart** the OpenWork server on the remote host so the browser can complete preflight and API requests. For RunPod: `git pull` in the repo (e.g. `/workspace/Aria`), then run `./runpod-start.sh` (or restart the server process). Until the server is restarted with the updated CORS, the app may show connection or “Run failed” errors when using the remote worker.

---

## 6. Key Code References

| Topic | Location |
|-------|----------|
| Workspace id from path | `packages/server/src/workspaces.ts` — `workspaceIdForPath` |
| Route table, auth, proxy | `packages/server/src/server.ts` — `addRoute`, `parseWorkspaceMount`, `requireClient`, `proxyOpencodeRequest`, `resolveWorkspace` |
| Token and health routes | `packages/server/src/server.ts` — `/token`, `/health`, `/w/:id/health`, `/status`, `/w/:id/status` |
| OpenWork client (health, status, workspaces, token fetch) | `packages/app/src/app/lib/openwork-server.ts` — `createOpenworkServerClient`, `fetchOpenworkTokenFromServer`, `buildOpenworkWorkspaceBaseUrl`, `buildHeaders` (NGROK_SKIP) |
| Resolve remote host + workspace | `packages/app/src/app/context/workspace.ts` — `resolveOpenworkHost` |
| Connect and OpenCode client with live token | `packages/app/src/app/context/workspace.ts` — `connectToServer`, `getOpenworkAuthForConnect`; `packages/app/src/app/lib/opencode.ts` — `createClient(..., getAuth)` |
| Create remote workspace | `packages/app/src/app/context/workspace.ts` — `createRemoteWorkspaceFlow` |
| RunPod start script | `runpod-start.sh` (env, ports, ngrok, openwork-server + OpenCode) |

This completes the technical report on local vs remote workers, how the remote worker is connected, and how the main endpoints and proxy behave.
