# MAYA RunPod Deployment Guide (Simplified)

This guide walks you through deploying the `maya-server` and `opencode` engine on a fresh RunPod instance.

## 1. Quick Start (Fresh RunPod Instance)

When you spin up a brand new RunPod instance (e.g., Ubuntu), run these commands in the terminal step-by-step:

```bash
# ── 1. System packages ─────────────────────────────────────
apt-get update -qq && apt-get install -y curl wget git unzip lsof

# ── 2. Node.js 20 ──────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ── 3. opencode (AI engine) ────────────────────────────────
curl -fsSL https://opencode.ai/install | sh
source ~/.bashrc

# ── 4. Clone your repo ─────────────────────────────────────
git clone https://github.com/Kavin56/MAYA.git /workspace/MAYA
cd /workspace/MAYA

# ── 5. Run the startup script ──────────────────────────────
chmod +x runpod-start.sh
./runpod-start.sh
```

## 2. What `runpod-start.sh` does automatically

The script automatically handles the rest:
1. Installs `bun`, `ngrok`, and `pnpm`.
2. Authenticates ngrok using your token.
3. Installs all project dependencies (`pnpm install`).
4. Generates security tokens if they don't exist.
5. Starts the **ngrok tunnel** to `unameliorative-regretably-kimberly.ngrok-free.dev`.
6. Starts the **opencode** server on port `4096`.
7. Starts the **maya-server** on port `8787`.

## 3. Post-Deployment (Connecting the Frontend)

Once the script finishes, you will see an output box like this:

```
╔════════════════════════════════════════════════════════════════╗
║  🚀 All services running!                                      ║
╟────────────────────────────────────────────────────────────────╢
║  Local server:  http://localhost:8787                          ║
║  Public URL: https://unameliorative-regretably-kimberly.ngrok-free.dev      ║
║  Health check URL:                                             ║
║    https://unameliorative-regretably-kimberly.ngrok-free.dev/health        ║
╟────────────────────────────────────────────────────────────────╢
...
Client token (use in web UI): ow-client-XXXXXXXXXXXXXXXXXXXXXXXX
```

**In your local frontend code:**
Update your `.env.local` to use the ngrok URL:
```env
VITE_OPENWORK_URL=https://unameliorative-regretably-kimberly.ngrok-free.dev
```

When you open the web UI, it will prompt you for a token — use the **Client token** printed at the bottom of the script output.

## Troubleshooting

If something fails, the script leaves logs in the `/tmp` directory:
- `cat /tmp/maya-server.log`
- `cat /tmp/opencode.log`
- `cat /tmp/ngrok.log`

For subsequent runs on the *same* pod, you only need to run:
```bash
cd /workspace/MAYA
git pull origin master
./runpod-start.sh
```
establish a permanent streaming 5-minute timeout connection to the Cloud Worker! All subsequent queries to the MAYA AI will be seamlessly executed on your RunPod VPS.
