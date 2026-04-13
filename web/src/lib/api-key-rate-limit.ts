import { createHash } from "crypto";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60_000;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

function rateLimitKeyForToken(token: string, request: NextRequest): string {
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex").slice(0, 32);
  return `${tokenHash}:${clientIp(request)}`;
}

function maxPerWindow(): number {
  const raw = process.env.API_KEY_RATE_LIMIT_PER_MINUTE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 120;
  return Number.isFinite(n) && n > 0 ? n : 120;
}

/** Returns false when the key should be throttled (429). */
export function checkApiKeyRateLimit(token: string, request: NextRequest): { ok: true } | { ok: false; retryAfter: number } {
  const key = rateLimitKeyForToken(token, request);
  const now = Date.now();
  const max = maxPerWindow();
  let b = buckets.get(key);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    const retryAfter = Math.max(1, Math.ceil((b.windowStart + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfter };
  }
  if (buckets.size > 50_000) {
    for (const [k, v] of buckets) {
      if (now - v.windowStart >= WINDOW_MS * 2) {
        buckets.delete(k);
      }
    }
  }
  return { ok: true };
}
