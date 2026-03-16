#!/usr/bin/env node
/**
 * Run Tauri build with NSIS on PATH/NSISDIR so the bundler can create the setup.exe.
 * Use this if `pnpm build` from root does not create target/release/bundle/nsis/.
 *
 * From repo root: pnpm --filter @different-ai/openwork run build:installer
 * From packages/desktop: pnpm run build:installer
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.platform === "win32") {
  const nsisPaths = [
    process.env.NSISDIR,
    "C:\\Program Files (x86)\\NSIS",
    "C:\\Program Files\\NSIS",
  ].filter(Boolean);
  for (const dir of nsisPaths) {
    if (existsSync(join(dir, "makensis.exe"))) {
      process.env.PATH = `${dir};${process.env.PATH}`;
      process.env.NSISDIR = dir;
      console.log("[openwork] Using NSIS at:", dir);
      break;
    }
  }
}

execSync("tauri build --verbose", {
  stdio: "inherit",
  cwd: join(__dirname, ".."),
});
