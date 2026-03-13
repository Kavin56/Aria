#!/usr/bin/env node
/**
 * Cross-platform dev runner: sets OPENWORK_DEV_MODE and OPENWORK_DATA_DIR
 * then runs tauri dev (avoids Unix-only VAR=value and $HOME on Windows).
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const port = process.env.PORT || "5173";
process.env.OPENWORK_DEV_MODE = "1";
process.env.OPENWORK_DATA_DIR =
  process.env.OPENWORK_DATA_DIR ||
  join(homedir(), ".openwork", "openwork-orchestrator-dev");

const devUrl = `http://localhost:${port}`;
const tmpDir = mkdtempSync(join(tmpdir(), "openwork-tauri-"));
const devUrlConfigPath = join(tmpDir, "dev-url.json");
writeFileSync(devUrlConfigPath, JSON.stringify({ build: { devUrl } }, null, 0));

// On Windows, Cargo often fails to overwrite `target\\debug\\openwork.exe` if a
// previous instance is still shutting down or a scanner briefly locks the file.
// Use an isolated target dir per run to avoid reusing a locked artifact path.
process.env.CARGO_TARGET_DIR = process.env.CARGO_TARGET_DIR || join(tmpDir, "cargo-target");

const tauriArgs = [
  "dev",
  "--config",
  "src-tauri/tauri.dev.conf.json",
  "--config",
  devUrlConfigPath,
];

const child = spawn("npx", ["tauri", ...tauriArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
child.on("exit", (code) => {
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
