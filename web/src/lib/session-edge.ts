/**
 * Minimal session decode for Edge Runtime (middleware) — verifies HMAC only,
 * no Node crypto. Used for admin route role checks (P0-BE-3).
 */

import { resolveSessionSigningSecret } from "@/lib/session-secret-resolver";

export interface EdgeSessionPayload {
  userId: string;
  role: string;
  name: string;
  sessionVersion: number;
  exp: number;
}

function getSessionSecret(): string | null {
  return resolveSessionSigningSecret();
}

async function signPayloadBase64(payloadBase64: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadBase64));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Decodes and verifies the vibehub_session cookie. Returns null if invalid or expired.
 */
export async function decodeSessionEdge(raw?: string): Promise<EdgeSessionPayload | null> {
  if (!raw) return null;
  const secret = getSessionSecret();
  if (!secret) return null;

  try {
    const [payloadBase64, signature] = raw.split(".");
    if (!payloadBase64 || !signature) return null;

    const expectedSig = await signPayloadBase64(payloadBase64, secret);
    if (!timingSafeEqual(signature, expectedSig)) return null;

    const padded = payloadBase64 + "==".slice(0, (4 - (payloadBase64.length % 4)) % 4);
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (typeof json.userId !== "string" || typeof json.role !== "string" || typeof json.name !== "string") {
      return null;
    }
    const exp = typeof json.exp === "number" ? json.exp : 0;
    if (exp <= Math.floor(Date.now() / 1000)) return null;

    const sessionVersion =
      typeof json.sessionVersion === "number" && Number.isFinite(json.sessionVersion) ? json.sessionVersion : 0;

    return {
      userId: json.userId,
      role: json.role,
      name: json.name,
      sessionVersion,
      exp,
    };
  } catch {
    return null;
  }
}
