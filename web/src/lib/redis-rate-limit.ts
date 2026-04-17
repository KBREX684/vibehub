import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip-rate-limit";
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { getRedisHealth } from "@/lib/redis";

export type ApiKeyRateLimitScopeTier = "read_public" | "write";
type Bucket = { count: number; windowStart: number };
const WINDOW_MS = 60_000;
const memoryBuckets = new Map<string, Bucket>();

export function clientIp(request: NextRequest): string {
  if (process.env.TRUST_IP_HEADERS === "true") {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  return getClientIp(request);
}

export function rateLimitKeyForToken(token: string, request: NextRequest): string {
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex").slice(0, 32);
  return `${tokenHash}:${clientIp(request)}`;
}

function maxPerWindow(): number {
  const raw = process.env.API_KEY_RATE_LIMIT_PER_MINUTE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 120;
  return Number.isFinite(n) && n > 0 ? n : 120;
}

function maxPerWindowByScope(scopeTier?: ApiKeyRateLimitScopeTier): number {
  if (scopeTier === "read_public") {
    const raw = process.env.API_KEY_RATE_LIMIT_PER_MINUTE_READ_PUBLIC?.trim();
    const n = raw ? Number.parseInt(raw, 10) : 240;
    return Number.isFinite(n) && n > 0 ? n : 240;
  }
  if (scopeTier === "write") {
    const raw = process.env.API_KEY_RATE_LIMIT_PER_MINUTE_WRITE?.trim();
    const n = raw ? Number.parseInt(raw, 10) : 90;
    return Number.isFinite(n) && n > 0 ? n : 90;
  }
  return maxPerWindow();
}

function checkMemoryWithScope(
  token: string,
  request: NextRequest,
  scopeTier?: ApiKeyRateLimitScopeTier
): { ok: true } | { ok: false; retryAfter: number } {
  const keyBase = rateLimitKeyForToken(token, request);
  const bucketKey = scopeTier ? `${keyBase}:${scopeTier}` : keyBase;
  const now = Date.now();
  const max = maxPerWindowByScope(scopeTier);
  let bucket = memoryBuckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    memoryBuckets.set(bucketKey, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000)),
    };
  }
  if (memoryBuckets.size > 50_000) {
    for (const [key, value] of memoryBuckets) {
      if (now - value.windowStart >= WINDOW_MS * 2) {
        memoryBuckets.delete(key);
      }
    }
  }
  return { ok: true };
}

export function checkApiKeyRateLimitMemory(
  token: string,
  request: NextRequest,
  scopeTier?: ApiKeyRateLimitScopeTier
): { ok: true } | { ok: false; retryAfter: number } {
  return checkMemoryWithScope(token, request, scopeTier);
}

/** Synchronous in-process limiter is no longer exposed as the primary path in W8. */
export async function checkApiKeyRateLimitAsync(
  token: string,
  request: NextRequest,
  scopeTier?: ApiKeyRateLimitScopeTier
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const result = await checkDistributedRateLimit({
    bucketKey: `apikey:${scopeTier ?? "default"}:${rateLimitKeyForToken(token, request)}`,
    maxRequests: maxPerWindowByScope(scopeTier),
  });
  if (!result.ok) {
    return { ok: false, retryAfter: result.retryAfterSeconds };
  }
  return { ok: true };
}

export { getRedisHealth };
