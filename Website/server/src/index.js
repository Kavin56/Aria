import "dotenv/config";
import Fastify from "fastify";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 5332);
const RUNPOD_BASE_URL = (process.env.SWIFT_RUNPOD_BASE_URL || "https://unameliorative-regretably-kimberly.ngrok-free.dev").replace(/\/+$/, "");
const RUNPOD_HOST_TOKEN = (process.env.SWIFT_RUNPOD_HOST_TOKEN || "").trim();
const WORKSPACE_PATH_PREFIX = (process.env.SWIFT_WORKSPACE_PATH_PREFIX || "/workspace/swift").trim() || "/workspace/swift";
const WORKSPACE_DIRECTORY = (process.env.SWIFT_WORKSPACE_DIRECTORY || "/workspace").trim() || "/workspace";
const SUPABASE_URL = (process.env.SWIFT_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SWIFT_SUPABASE_SERVICE_ROLE_KEY || "").trim();

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function id(bytes = 8) {
  return randomBytes(bytes).toString("hex");
}
function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}
function workspaceIdForPath(path) {
  return `ws_${sha256Hex(path).slice(0, 12)}`;
}

app.get("/health", async () => ({ ok: true }));

app.post("/api/validate", async (req, reply) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const url = typeof body.url === "string" ? body.url.trim().replace(/\/+$/, "") : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!supabase) {
    reply.code(500);
    return { ok: false, error: "Swift Supabase is not configured on this server" };
  }
  if (!url || !token) {
    reply.code(400);
    return { ok: false, error: "url and token are required" };
  }

  const tokenHash = sha256Hex(token);
  const { data, error } = await supabase.rpc("swift_validate_worker", {
    url,
    token_hash: tokenHash,
  });
  if (error) {
    reply.code(500);
    return { ok: false, error: error.message };
  }
  return { ok: Boolean(data) };
});

app.post("/api/remote-worker", async (req, reply) => {
  if (!RUNPOD_HOST_TOKEN) {
    reply.code(500);
    return { ok: false, error: "SWIFT_RUNPOD_HOST_TOKEN is not configured on the website server" };
  }

  const suffix = id(6);
  const workspacePath = `${WORKSPACE_PATH_PREFIX}/${suffix}`;
  const workspaceId = workspaceIdForPath(workspacePath);

  // 1) Create (or upsert) a workspace mount on the remote OpenWork server.
  const wsRes = await fetch(`${RUNPOD_BASE_URL}/workspaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OpenWork-Host-Token": RUNPOD_HOST_TOKEN,
      "ngrok-skip-browser-warning": "1"
    },
    body: JSON.stringify({
      path: workspacePath,
      directory: WORKSPACE_DIRECTORY,
      name: `swift-${suffix}`
    })
  });
  if (!wsRes.ok) {
    const text = await wsRes.text().catch(() => "");
    reply.code(502);
    return { ok: false, error: `Failed to create workspace (${wsRes.status})`, details: text };
  }

  // 2) Mint a unique client token.
  const tokenRes = await fetch(`${RUNPOD_BASE_URL}/tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OpenWork-Host-Token": RUNPOD_HOST_TOKEN,
      "ngrok-skip-browser-warning": "1"
    },
    body: JSON.stringify({
      scope: "collaborator",
      label: `swift:${workspaceId}`
    })
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    reply.code(502);
    return { ok: false, error: `Failed to mint token (${tokenRes.status})`, details: text };
  }
  const tokenJson = await tokenRes.json();

  // Important: use a /w/:id base so the desktop app can call /w/:id/health etc.
  const url = `${RUNPOD_BASE_URL}/w/${workspaceId}`;

  if (supabase) {
    const token = typeof tokenJson?.token === "string" ? tokenJson.token.trim() : "";
    if (token) {
      const { error } = await supabase.from("swift_workers").insert({
        url,
        token_hash: sha256Hex(token),
        workspace_id: workspaceId,
      });
      if (error) {
        req.log.warn({ err: error }, "Failed to store worker in Supabase");
      }
    }
  }

  return {
    ok: true,
    url,
    token: tokenJson.token,
    workspaceId
  };
});

await app.listen({ port: PORT, host: "0.0.0.0" });

