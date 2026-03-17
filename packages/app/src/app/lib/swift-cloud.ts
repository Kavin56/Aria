import { NGROK_SKIP_HEADER } from "./openwork-server";

type SwiftCloudValidationResult = { ok: true } | { ok: false; error: string };

const SUPABASE_URL = (import.meta as any).env?.VITE_SWIFT_SUPABASE_URL?.trim?.() || "";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SWIFT_SUPABASE_ANON_KEY?.trim?.() || "";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate a user-provided (url, swiftKey) pair against Supabase without exposing rows.
 *
 * Requires a Supabase RPC:
 * - function: swift_validate_key(url text, key_hash text) returns boolean
 */
export async function validateRemoteWorkerInSwiftCloud(input: {
  url: string;
  token: string; // In UI this is pasted into "Access token" field, but it is the Swift key.
}): Promise<SwiftCloudValidationResult> {
  const url = input.url.trim().replace(/\/+$/, "");
  const swiftKey = input.token.trim();

  // If Swift Cloud is not configured, allow legacy/manual remote connect.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: true };
  if (!url || !swiftKey) return { ok: false, error: "URL and Swift key are required." };

  try {
    const keyHash = await sha256Hex(swiftKey);
    const res = await fetch(`${SUPABASE_URL.replace(/\\/+$/, "")}/rest/v1/rpc/swift_validate_key`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        ...NGROK_SKIP_HEADER,
      } as any,
      body: JSON.stringify({ url, key_hash: keyHash }),
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    const valid = res.ok && (json === true || json?.result === true);
    if (!valid) return { ok: false, error: "Invalid Swift key for this URL." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

