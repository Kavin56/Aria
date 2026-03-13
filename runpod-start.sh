#!/bin/bash
# =============================================================================
# MAYA / OpenWork RunPod Startup Script
# Starts OpenWork server (openwork-server) + OpenCode backend + ngrok tunnel.
# Use this to host the OpenCode backend on RunPod for remote workers.
#
# One-time setup on a fresh RunPod instance:
#   apt-get update -qq && apt-get install -y curl wget git unzip lsof
#   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
#   apt-get install -y nodejs
#   curl -fsSL https://opencode.ai/install | sh && source ~/.bashrc
#   git clone https://github.com/Kavin56/MAYA.git /workspace/MAYA
#   cd /workspace/MAYA && chmod +x runpod-start.sh && ./runpod-start.sh
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PORT=8787
OPENCODE_PORT=4096

export NGROK_DOMAIN="${NGROK_DOMAIN:-unameliorative-regretably-kimberly.ngrok-free.dev}"
export NGROK_AUTHTOKEN="${NGROK_AUTHTOKEN:-3AsGlODWFrruTjeoUYbH3N0uVgN_31vM8icuUDYZM11D4oqzX}"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║         MAYA RunPod Startup                ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ─── 0. Ensure lsof (for port checks) ────────────────────────────────────────
if ! command -v lsof &>/dev/null; then
  echo "[0/5] Installing lsof..."
  apt-get update -qq && apt-get install -y lsof -qq
fi

# ─── 1. Install Bun ──────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "[1/5] Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo "      Bun installed: $(bun --version)"
else
  echo "[1/5] Bun already installed: $(bun --version)"
fi

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# ─── 2. Install ngrok ────────────────────────────────────────────────────────
if ! command -v ngrok &>/dev/null; then
  echo "[2/5] Installing ngrok..."
  curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc -o /etc/apt/trusted.gpg.d/ngrok.asc
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" > /etc/apt/sources.list.d/ngrok.list
  apt-get update -qq && apt-get install -y ngrok -qq
  echo "      ngrok installed: $(ngrok version)"
else
  echo "[2/5] ngrok already installed: $(ngrok version)"
fi

# ─── 3. Authenticate ngrok (only if token set) ─────────────────────────────────
echo "[3/5] Configuring ngrok..."
if [ -n "$NGROK_AUTHTOKEN" ]; then
  ngrok config add-authtoken "$NGROK_AUTHTOKEN"
  echo "      ngrok authenticated."
else
  echo "      [warn] NGROK_AUTHTOKEN empty — tunnel will be skipped."
fi

# ─── 4. Install project dependencies ─────────────────────────────────────────
echo "[4/5] Installing project dependencies..."
cd "$SCRIPT_DIR"
if ! command -v pnpm &>/dev/null; then
  echo "      Installing pnpm..."
  npm install -g pnpm
fi
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "      Dependencies installed."

# ─── 5. Set environment variables ────────────────────────────────────────────
echo "[5/5] Configuring environment..."
export MAYA_HOST=0.0.0.0
export MAYA_PORT=$SERVER_PORT
export MAYA_APPROVAL_MODE=auto
export MAYA_CORS_ORIGINS="*"
export MAYA_OPENCODE_BASE_URL="http://127.0.0.1:$OPENCODE_PORT"
export MAYA_WORKSPACES="${MAYA_WORKSPACES:-/workspace}"

if [ -z "$MAYA_TOKEN" ]; then
  export MAYA_TOKEN="ow-client-$(head -c 16 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"
  echo "      Generated client token: $MAYA_TOKEN"
  echo "      ⚠️  Save this token — you'll need it in the web UI (Advanced / Config)"
else
  echo "      Using MAYA_TOKEN from environment."
fi
export OPENWORK_TOKEN="${OPENWORK_TOKEN:-$MAYA_TOKEN}"

if [ -z "$MAYA_HOST_TOKEN" ]; then
  export MAYA_HOST_TOKEN="ow-host-$(head -c 16 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"
  echo "      Generated host token: $MAYA_HOST_TOKEN"
else
  echo "      Using MAYA_HOST_TOKEN from environment."
fi
export OPENWORK_HOST_TOKEN="${OPENWORK_HOST_TOKEN:-$MAYA_HOST_TOKEN}"

echo ""
echo "─────────────────────────────────────────────"
echo " Starting services (ngrok tunnel FIRST)..."
echo "─────────────────────────────────────────────"

for p in $OPENCODE_PORT $SERVER_PORT 5000; do
  pid=$(lsof -ti ":$p" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  Stopping existing process on port $p (PID $pid)"
    kill $pid 2>/dev/null || true
    sleep 1
  fi
done

echo ""
echo "========== NGROK TUNNEL (starting first) =========="
if [ -z "$NGROK_AUTHTOKEN" ]; then
  echo "  [SKIP] NGROK_AUTHTOKEN not set — tunnel will not start."
else
  echo "  Stopping any existing ngrok..."
  pkill -9 ngrok 2>/dev/null || true
  killall -9 ngrok 2>/dev/null || true
  sleep 4
  echo "  Starting ngrok tunnel: port $SERVER_PORT -> https://$NGROK_DOMAIN"
  : > /tmp/ngrok.log
  set +e
  nohup ngrok http "$SERVER_PORT" --url="https://$NGROK_DOMAIN" >> /tmp/ngrok.log 2>&1 &
  NGROK_PID=$!
  disown $NGROK_PID 2>/dev/null || true
  echo "  Waiting for ngrok to register (4s)..."
  sleep 4
  if ps -p $NGROK_PID > /dev/null 2>&1; then
    echo "  *** NGROK TUNNEL IS RUNNING *** (PID $NGROK_PID)"
    echo "  Public URL: https://$NGROK_DOMAIN"
  else
    echo "  *** NGROK FAILED *** Run: tail -30 /tmp/ngrok.log"
    tail -20 /tmp/ngrok.log
  fi
  set -e
fi
echo "=================================================="
echo ""

# ─── 2. Start opencode server ─────────────────────────────────────────────────
if command -v opencode &>/dev/null; then
  echo "▶ Starting opencode server on port $OPENCODE_PORT..."
  nohup opencode serve --port "$OPENCODE_PORT" > /tmp/opencode.log 2>&1 &
  OPENCODE_PID=$!
  echo "  opencode PID: $OPENCODE_PID"
  sleep 2
else
  echo "⚠  opencode not found — the server will work but AI features require opencode installed."
  echo "   Install: curl -fsSL https://opencode.ai/install | bash"
fi

# ─── 3. Start OpenWork server on port 8787 ────────────────────────────────────
# This repo (Aria): openwork-server. MAYA fork (Kavin56/MAYA): set SERVER_PACKAGE=maya-server
SERVER_PACKAGE="${SERVER_PACKAGE:-openwork-server}"
echo "▶ Starting OpenWork server ($SERVER_PACKAGE) on port $SERVER_PORT..."
# Use -- so pnpm forwards args to the dev script (required for --host/--port)
pnpm --filter "$SERVER_PACKAGE" dev -- \
  --host 0.0.0.0 \
  --port "$SERVER_PORT" \
  --approval auto \
  --cors "*" \
  --opencode-base-url "http://127.0.0.1:$OPENCODE_PORT" \
  --workspace "$MAYA_WORKSPACES" \
  > /tmp/maya-server.log 2>&1 &
SERVER_PID=$!
echo "  OpenWork server PID: $SERVER_PID"

# Wait for server to bind (retry a few times; startup can be slow)
set +e
for i in 1 2 3 4 5; do
  sleep 2
  if curl -sf "http://127.0.0.1:$SERVER_PORT/health" >/dev/null; then
    echo "  ✓ OpenWork server is healthy on port $SERVER_PORT"
    break
  fi
  if [ "$i" -eq 5 ]; then
    echo "  ✗ OpenWork server health check failed after 10s — nothing is listening on port $SERVER_PORT"
    echo "  If you see ngrok ERR_NGROK_8012, the tunnel is up but this server did not start."
    echo "  Last 40 lines of /tmp/maya-server.log:"
    tail -40 /tmp/maya-server.log
  fi
done
set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚀 All services running!                                      ║"
echo "╟────────────────────────────────────────────────────────────────╢"
echo "║  Local server:  http://localhost:$SERVER_PORT                      ║"
echo "║  Public URL: https://$NGROK_DOMAIN      ║"
echo "║  Health check URL:                                             ║"
echo "║    https://$NGROK_DOMAIN/health        ║"
echo "╟────────────────────────────────────────────────────────────────╢"
echo "║  Logs:                                                         ║"
echo "║    opencode:    /tmp/opencode.log                              ║"
echo "║    openwork:    /tmp/maya-server.log                          ║"
echo "║    ngrok:       /tmp/ngrok.log                                 ║"
echo "╟────────────────────────────────────────────────────────────────╢"
echo "║  In the web app: Settings → Advanced → choose Cloud Worker,   ║"
echo "║  set Remote Worker URL to the Public URL above, and set the    ║"
echo "║  token (Config tab or Advanced) to the Client token below.    ║"
echo "╟────────────────────────────────────────────────────────────────╢"
echo "║  If you see ngrok ERR_NGROK_8012 (connection refused):         ║"
echo "║  On this machine run: curl -s http://127.0.0.1:$SERVER_PORT/health   ║"
echo "║  If that fails, the OpenWork server did not start — check      ║"
echo "║  /tmp/maya-server.log and ensure SERVER_PACKAGE is correct.   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Client token (paste in web UI Config/Advanced): $MAYA_TOKEN"
echo ""

wait $SERVER_PID