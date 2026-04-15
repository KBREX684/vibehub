import { resolveSessionSigningSecret } from "@/lib/session-secret-resolver";

function base64UrlToBytes(b64url: string): Uint8Array | null {
  try {
    const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Verifies HMAC-SHA256 over the payload segment (same construction as Node `auth.ts` signPayload).
 * Used in Edge middleware where Node crypto is unavailable; does not decode claims or check expiry.
 */
export async function verifySessionCookieSignature(raw: string): Promise<boolean> {
  const secret = resolveSessionSigningSecret();
  if (!secret || !raw) {
    return false;
  }
  const dot = raw.indexOf(".");
  if (dot < 1 || dot >= raw.length - 1) {
    return false;
  }
  const payloadB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  const got = base64UrlToBytes(sigB64);
  if (!got) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const expected = new Uint8Array(sigBuf);
  return timingSafeEqualBytes(got, expected);
}
