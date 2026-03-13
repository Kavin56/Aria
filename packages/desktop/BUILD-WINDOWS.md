# Building the desktop app on Windows

If the Tauri desktop build fails on Windows, you may see:

## 1. `document-features` errors (Some, Ok, Err, String not in scope)

**Cause:** The `document-features` crate (v0.2.12), pulled in by `cookie_store` → `tauri-plugin-http`, can be built in a `no_std` context on Windows, which breaks its proc-macro.

**Workarounds:**

- **Use the web app instead** (no Rust build):
  ```bash
  pnpm dev:web
  ```
- **Build on WSL2** (Linux target) from the repo root, then run the built binary or use the web UI.
- **Wait for upstream:** Track [slint-ui/document-features](https://github.com/slint-ui/document-features) or [tauri-apps/tauri](https://github.com/tauri-apps/tauri) for a fix.

## 2. `STATUS_STACK_BUFFER_OVERRUN` (0xc0000409) in rustc

**Cause:** Known Rust/Windows issue (e.g. [rust-lang/rust#120955](https://github.com/rust-lang/rust/issues/120955)) — compiler or linker stack overflow.

**Workarounds:**

- Retry the build (sometimes succeeds on second run).
- Build with a single job and larger stack:
  ```powershell
  $env:CARGO_BUILD_JOBS = "1"
  $env:RUST_MIN_STACK = "8388608"
  pnpm dev
  ```
- Try a **release** build (often more stable):
  ```bash
  pnpm --filter @different-ai/openwork exec tauri build
  ```

## Recommended for local development on Windows

Use the web UI to avoid the desktop Rust toolchain:

```bash
pnpm dev:web
```

Open the URL Vite prints (e.g. http://localhost:5173). You can connect to a local or remote OpenWork server from there.
