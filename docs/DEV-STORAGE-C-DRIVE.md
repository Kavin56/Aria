# Where `pnpm dev` Uses C: Drive Storage

When you run `pnpm dev`, the app and build tooling write to several locations on **C:** (Windows). If your C: drive is low on space (e.g. down from 65 GB to 14 GB), these are the places to check.

**To see what’s using space:** run the audit script from the repo root:

```powershell
.\scripts\audit-c-drive-storage.ps1
```

It lists sizes for all known locations (Temp, .openwork, .cargo, .rustup, pnpm store, Cursor, etc.).

---

## 1. **Temp directory (often the biggest)**

### 1a. `openwork-tauri-*` (Cargo dev build)

**Path:** `C:\Users\<you>\AppData\Local\Temp\openwork-tauri-*`

- The dev script creates a temp dir and sets **CARGO_TARGET_DIR** to `...\openwork-tauri-XXX\cargo-target`.
- The **Rust debug build** can be **several GB** per run. The script deletes it only on normal exit; if you Ctrl+C, kill the terminal, or it crashes, these folders stay and **accumulate**.

### 1b. `opencode-*` (prepare-sidecar zip + extracted folder)

**Path:** `C:\Users\<you>\AppData\Local\Temp\opencode-*`

- **Every time** you run `pnpm dev`, the **beforeDevCommand** runs `prepare-sidecar.mjs`, which downloads the OpenCode zip (e.g. 150 MB) to Temp and extracts it. Previously these were **not** deleted after use, so each run left `opencode-<timestamp>-*.zip` and `opencode-<timestamp>\` (hundreds of MB each). **Many dev runs can add up to tens of GB.** The script now cleans these up; old runs will have left them behind.

### 1c. `openwork-orchestrator-opencode-*`

**Path:** `C:\Users\<you>\AppData\Local\Temp\openwork-orchestrator-opencode-*`

- When the orchestrator downloads OpenCode, it uses a temp zip and extract dir here. They are removed on success/failure; if a run was killed, leftovers may remain.

**What to do:**

- Delete all OpenWork-related temp folders:
  ```powershell
  Remove-Item -Recurse -Force "$env:TEMP\openwork-tauri-*" -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force "$env:TEMP\opencode-*" -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force "$env:TEMP\openwork-orchestrator-opencode-*" -ErrorAction SilentlyContinue
  ```
- Use a Cargo target on D: when the repo is on another drive (see below) so new builds don’t use C:.

---

## 2. **Orchestrator dev data (dev mode) – includes downloaded .exe sidecars**

**Path:** `C:\Users\vskav\.openwork\openwork-orchestrator-dev`

- Set by the dev script via `OPENWORK_DATA_DIR`.
- Contains:
  - **sidecars/** – **Downloaded executables**: OpenCode (`opencode.exe`), openwork-server, opencode-router. Multiple **versions** are kept (e.g. `sidecars/opencode/<version>/windows-x64/opencode.exe`). Each binary can be 50–200+ MB; several versions can be several GB.
  - OpenWork orchestrator state, **opencode-dev** workspaces (per-workspace config/cache), sandbox data, router state, logs, DBs.
- Can grow to many GB.

**What to do:**

- To reset dev state (and free space): delete this folder when the app is not running:
  ```powershell
  Remove-Item -Recurse -Force "$env:USERPROFILE\.openwork\openwork-orchestrator-dev" -ErrorAction SilentlyContinue
  ```

---

## 3. **OpenWork app data (Tauri)**

**Path:** `C:\Users\vskav\AppData\Roaming\com.differentai.openwork`

- Tauri `app_data_dir()`.
- Contains:
  - `openwork-workspaces.json`
  - **`opencode-dev\`** – per-workspace OpenCode dev roots (config, cache, state) when using the desktop app in dev mode.

**What to do:**

- You can remove the **`opencode-dev`** subfolder to clear dev caches (workspace list is in `openwork-workspaces.json` and is small).
- Or use the in-app “Clear cache” / “Nuke OpenCode dev config” (if available) for a controlled cleanup.

---

## 4. **OpenWork app cache (Tauri)**

**Path:** `C:\Users\vskav\AppData\Local\com.differentai.openwork`

- Tauri `app_cache_dir()`.
- General app cache; usually smaller than the above.

**What to do:**

- Safe to delete when the app is closed if you want to free a bit of space.

---

## 5. **Other `.openwork` data (if used)**

**Paths:**

- `C:\Users\vskav\.openwork\openwork-orchestrator` – production orchestrator data (used when not in dev).
- `C:\Users\vskav\.openwork\opencode-router` – OpenCode Router data when run via orchestrator (DB, logs).

These matter if you also run the app in production mode or use router; they’re not created only by `pnpm dev`.

---

## 6. **Rust/Cargo cache (can be 10–30+ GB)**

**Paths:** `C:\Users\<you>\.cargo\registry`, `.cargo\git`, `.rustup` – Cargo crate cache and Rust toolchains. Building the Tauri app fills these. Optional cleanup: remove `%USERPROFILE%\.cargo\registry\cache` and `\.cargo\git\checkouts` (next build will re-download).

---

## 7. **pnpm store**

**Path:** `%LOCALAPPDATA%\pnpm\store` – Can be several GB for a large monorepo. Run `pnpm store prune` to remove unreferenced packages.

---

## 8. **Cursor**

**Paths:** `%APPDATA%\Cursor\Cache`, `CachedData`, `CachedExtensions` – Can be several GB. Clear via Cursor or delete with Cursor closed.

---

## Summary: quick cleanup (free space on C:)

Run in PowerShell (with the app closed):

```powershell
# 1. Temp: orphaned dev builds + prepare-sidecar leftovers (often largest)
Remove-Item -Recurse -Force "$env:TEMP\openwork-tauri-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\opencode-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\openwork-orchestrator-opencode-*" -ErrorAction SilentlyContinue

# 2. Dev orchestrator data + downloaded sidecar .exe files (resets dev state)
Remove-Item -Recurse -Force "$env:USERPROFILE\.openwork\openwork-orchestrator-dev" -ErrorAction SilentlyContinue

# 3. OpenCode dev caches in AppData Roaming
Remove-Item -Recurse -Force "$env:APPDATA\com.differentai.openwork\opencode-dev" -ErrorAction SilentlyContinue

# 4. App cache (optional)
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\com.differentai.openwork" -ErrorAction SilentlyContinue
```

After this, running `pnpm dev` again will recreate what it needs; you may need to re-add workspaces or re-enter settings.

---

## Using a Cargo target on D: (automatic when repo is on another drive)

When the repo lives on a different drive than Windows TEMP (e.g. repo on **D:**, TEMP on **C:**), the dev script now sets **CARGO_TARGET_DIR** to the repo’s `packages/desktop/src-tauri/target` so the Rust build no longer uses C:.

If you still want to force a specific target dir (e.g. to avoid lock issues):

```powershell
$env:CARGO_TARGET_DIR = "D:\Aria\packages\desktop\src-tauri\target"
pnpm dev
```
