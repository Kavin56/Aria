#!/usr/bin/env node
/**
 * Cross-platform dev runner: sets OPENWORK_DEV_MODE and OPENWORK_DATA_DIR
 * then runs tauri dev (avoids Unix-only VAR=value and $HOME on Windows).
 */
import { homedir, tmpdir, platform } from "node:os";
import { join, resolve, parse } from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** On Windows, if sidecar processes are running the Tauri build can fail with "Access is denied". */
function warnIfSidecarProcessesRunning() {
  if (platform() !== "win32") return;
  const names = ["opencode.exe", "OpenWork.exe", "openwork-server", "opencode-router"];
  try {
    const out = execSync("tasklist /FO CSV /NH", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    const running = names.filter((n) => out.toLowerCase().includes(n.toLowerCase()));
    if (running.length) {
      console.warn(
        "\n[openwork] Some OpenWork/OpenCode processes are still running. " +
          "If the build fails with 'Access is denied', close them in Task Manager (Ctrl+Shift+Esc) and retry.\n"
      );
    }
  } catch {
    // Ignore: tasklist might be unavailable
  }
}

const port = process.env.PORT || "5173";
process.env.OPENWORK_DEV_MODE = "1";
process.env.OPENWORK_DATA_DIR =
  process.env.OPENWORK_DATA_DIR ||
  join(homedir(), ".openwork", "openwork-orchestrator-dev");

const devUrl = `http://localhost:${port}`;
const tmpDir = mkdtempSync(join(tmpdir(), "openwork-tauri-"));
const devUrlConfigPath = join(tmpDir, "dev-url.json");
writeFileSync(devUrlConfigPath, JSON.stringify({ build: { devUrl } }, null, 0));

// Cargo target dir: avoid filling C: when repo is on another drive (e.g. D:).
// On Windows, Cargo in Temp can use several GB per run and temp dirs may not be
// removed if the process is killed. If CARGO_TARGET_DIR is not set and the repo
// is not on the same drive as TEMP, use the repo's target so builds stay on the
// repo drive. Otherwise use an isolated temp dir per run to avoid exe lock issues.
function getCargoTargetDir() {
  if (process.env.CARGO_TARGET_DIR?.trim()) return process.env.CARGO_TARGET_DIR;
  const desktopRoot = resolve(__dirname, "..");
  const repoTarget = join(desktopRoot, "src-tauri", "target");
  if (process.platform === "win32") {
    const tempDrive = parse(resolve(tmpdir())).root;
    const repoDrive = parse(resolve(repoTarget)).root;
    if (tempDrive !== repoDrive) return repoTarget;
  }
  return join(tmpDir, "cargo-target");
}
process.env.CARGO_TARGET_DIR = getCargoTargetDir();

const tauriArgs = [
  "dev",
  "--config",
  "src-tauri/tauri.dev.conf.json",
  "--config",
  devUrlConfigPath,
];

warnIfSidecarProcessesRunning();

const child = spawn("npx", ["tauri", ...tauriArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
child.on("exit", (code) => {
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
