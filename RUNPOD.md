# Run OpenWork (Aria) on RunPod

One command from the repo root starts **openwork-server** (port 8787), **opencode** (port 4096), and **ngrok**.

**Repo path:** Use `/workspace/Aria` for this repo (Aria). For the MAYA fork, use `/workspace/MAYA`.

## 1. One-time setup on the pod

```bash
# System + Node + OpenCode (optional)
apt-get update -qq && apt-get install -y curl wget git unzip lsof
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
curl -fsSL https://opencode.ai/install | bash
source ~/.bashrc

# Clone this repo (Aria)
git clone <your-aria-repo-url> /workspace/Aria
cd /workspace/Aria
chmod +x runpod-start.sh
```

**Secrets:** The script loads `src/owl-backend/.env` **first** (before any defaults). Create it from the example:

```bash
cp src/owl-backend/.env.example src/owl-backend/.env
# Edit .env: set OPENROUTER_API_KEY, NGROK_AUTHTOKEN, and NGROK_DOMAIN (your reserved ngrok domain)
```

Required in `.env` for ngrok tunnel: `NGROK_AUTHTOKEN`, and `NGROK_DOMAIN` (e.g. `nondetonating-cecile-nongrounded.ngrok-free.dev`). Or set these as RunPod pod environment variables.

**Frontend (remote workspace / chat):** To avoid 401 on health and chat, add the worker token in the app. Get it from `https://<your-ngrok-domain>/token` and paste it when connecting to the MAYA worker so requests include `Authorization: Bearer <token>`.

## 2. Run everything

### After you push code — on RunPod (copy-paste)

From repo root (`/workspace/Aria`), pull then start:

```bash
cd /workspace/Aria
git pull origin main
sed -i 's/\r$//' runpod-start.sh 2>/dev/null
chmod +x runpod-start.sh
./runpod-start.sh
```

If you see **"bad interpreter: Permission denied"**, fix CRLF then run again:

```bash
cd /workspace/Aria && sed -i 's/\r$//' runpod-start.sh && chmod +x runpod-start.sh && ./runpod-start.sh
```

This will:

1. Install Bun, ngrok, and project deps if needed.
2. **Start ngrok tunnel FIRST** (so you see "NGROK TUNNEL IS RUNNING" or "NGROK FAILED" in the terminal before anything else).
3. Start **opencode** on port 4096 (if `opencode` is in PATH).
4. Start **OpenWork server** (`openwork-server`) on port 8787 — this must be up or you get ERR_NGROK_8012.

If the public URL shows **endpoint is offline (ERR_NGROK_3200)**:

- Ensure you have the latest script: `git checkout -- runpod-start.sh && git pull origin main`
- Ensure ngrok env vars are set: `NGROK_AUTHTOKEN`, `NGROK_DOMAIN` (or in `.env`).
- On the pod run: `tail -30 /tmp/ngrok.log` — if you see `ERR_NGROK_334` (endpoint already online), run `pkill -9 ngrok; sleep 4` then `./runpod-start.sh` again.

**If you see ERR_NGROK_8012 (connection refused to localhost:8787):**

- ngrok is running but the OpenWork server is not listening on port 8787.
- Run the **full** startup so the server starts: `cd /workspace/Aria && ./runpod-start.sh` (do not start only ngrok).
- If you already ran the script, the server may have crashed. Check:
  - `curl -s http://127.0.0.1:8787/health` — if this fails, nothing is on 8787.
  - `tail -80 /tmp/maya-server.log` — look for errors (e.g. missing `bun`, wrong `pnpm --filter openwork-server`).
- Ensure deps are installed: `cd /workspace/Aria && pnpm install`. Then run `./runpod-start.sh` again.

**CAMEL / `camel_available`:** PyPI has no `camel-ai>=0.2.0`. The script tries `camel-ai[all]` from PyPI; if the `camel` module is not available, it clones [camel-ai/owl](https://github.com/camel-ai/owl) and installs with `uv` (Python 3.10, `uv venv` + `uv pip install -e .`), then runs the OWL backend with that env so `/ping` can report `camel_available: true`. To do it manually: `git clone https://github.com/camel-ai/owl.git`, `cd owl`, `pip install uv`, `uv venv .venv --python=3.10`, `source .venv/bin/activate`, `uv pip install -e .`.

## 3. After it’s running

- **Public URL:** printed at the end (e.g. `https://nondetonating-cecile-nongrounded.ngrok-free.dev`).
- **Health:**  
  `https://<NGROK_DOMAIN>/health`  
  `https://<NGROK_DOMAIN>/ping` (proxies to OWL; expect `"message":"pong"` if OWL is up).
- **Debug key:**  
  `https://<NGROK_DOMAIN>/worker/debug/test-key`  
  Optional: `?model=google/gemini-2.5-flash`.

**Frontend (Netlify / Vercel / local):** set so the app uses this backend:

- `VITE_OPENWORK_URL=https://nondetonating-cecile-nongrounded.ngrok-free.dev`
- `VITE_API_URL=https://nondetonating-cecile-nongrounded.ngrok-free.dev/` (optional; same base URL)

The client token is printed by the script; the frontend can also fetch it from `/token`.
