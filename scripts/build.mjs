import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const isVercel = Boolean(process.env.VERCEL);
const command = isVercel
  ? "pnpm --dir services/openwork-share run build"
  : "pnpm --filter @different-ai/openwork build";

// On Windows, ensure NSIS is findable so Tauri can create the setup.exe installer.
// Set both PATH and NSISDIR (Rust bundler may check either).
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
      break;
    }
  }
}

execSync(command, { stdio: "inherit" });
