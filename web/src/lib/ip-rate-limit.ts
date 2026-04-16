import type { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_WRITES_PER_MINUTE = parseInt(process.env.WRITE_RATE_LIMIT_PER_MINUTE ?? "30", 10);

const ipBuckets = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;
  for (const [key, entry] of ipBuckets) {
    if (entry.resetAt <= now) {
      ipBuckets.delete(key);
    }
  }
}

/**
 * Prefer the socket address unless TRUST_IP_HEADERS=true (e.g. behind a trusted reverse proxy).
 * When trusted, use the first X-Forwarded-For hop or X-Real-IP.
 */
export function getClientIp(request: NextRequest): string {
  if (process.env.TRUST_IP_HEADERS === "true") {
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    );
  }
  const socketIp = (request as NextRequest & { ip?: string }).ip;
  return socketIp?.trim() || "unknown";
}

export function checkWriteRateLimit(request: NextRequest): { ok: true } | { ok: false; retryAfterSeconds: number } {
  cleanupStaleEntries();

  const ip = getClientIp(request);
  const now = Date.now();
  const existing = ipBuckets.get(ip);

  if (!existing || existing.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  existing.count++;
  if (existing.count > MAX_WRITES_PER_MINUTE) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true };
}
