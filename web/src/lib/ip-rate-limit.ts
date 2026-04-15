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

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
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
