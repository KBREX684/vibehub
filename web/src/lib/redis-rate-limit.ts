import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip-rate-limit";

const WINDOW_MS = 60_000;

type Bucket = { count: number; windowStart: number };
const memoryBuckets = new Map<string, Bucket>();

let redisClient: import("ioredis").default | null = null;
let redisInitFailed = false;

function redisUrl(): string | undefined {
  const u = process.env.REDIS_URL?.trim();
  return u || undefined;
}

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

export type ApiKeyRateLimitScopeTier = "read_public" | "write";

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
  const key = rateLimitKeyForToken(token, request);
  const bucketKey = scopeTier ? `${key}:scope:${scopeTier}` : key;
  const now = Date.now();
  const max = maxPerWindowByScope(scopeTier);
  let b = memoryBuckets.get(bucketKey);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { count: 0, windowStart: now };
    memoryBuckets.set(bucketKey, b);
  }
  b.count += 1;
  if (b.count > max) {
    const retryAfter = Math.max(1, Math.ceil((b.windowStart + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfter };
  }
  if (memoryBuckets.size > 50_000) {
    for (const [k, v] of memoryBuckets) {
      if (now - v.windowStart >= WINDOW_MS * 2) {
        memoryBuckets.delete(k);
      }
    }
  }
  return { ok: true };
}

/** Synchronous in-process limiter (default when no Redis; used by Vitest). */
export function checkApiKeyRateLimitMemory(
  token: string,
  request: NextRequest,
  scopeTier?: ApiKeyRateLimitScopeTier
): { ok: true } | { ok: false; retryAfter: number } {
  return checkMemoryWithScope(token, request, scopeTier);
}

async function getRedis(): Promise<import("ioredis").default | null> {
  const url = redisUrl();
  if (!url || redisInitFailed) {
    return null;
  }
  if (redisClient) {
    return redisClient;
  }
  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    return redisClient;
  } catch {
    redisInitFailed = true;
    return null;
  }
}

const LUA_INCR_WINDOW = `
local c = redis.call("INCR", KEYS[1])
if c == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return c
`;

/**
 * When `REDIS_URL` is set, uses Redis fixed windows per minute for distributed limiting.
 * On Redis errors or missing URL, falls back to the same in-process map as `checkApiKeyRateLimitMemory`.
 */
export async function checkApiKeyRateLimitAsync(
  token: string,
  request: NextRequest,
  scopeTier?: ApiKeyRateLimitScopeTier
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const max = maxPerWindowByScope(scopeTier);
  const redis = await getRedis();
  const now = Date.now();

  if (redis) {
    try {
      const keyBase = rateLimitKeyForToken(token, request);
      const windowId = Math.floor(now / WINDOW_MS);
      const scopeTag = scopeTier ? `:${scopeTier}` : "";
      const redisKey = `ratelimit:apikey${scopeTag}:${keyBase}:${windowId}`;
      const count = (await redis.eval(LUA_INCR_WINDOW, 1, redisKey, String(WINDOW_MS))) as number;
      if (count > max) {
        const pttl = await redis.pttl(redisKey);
        const retryAfter = Math.max(1, Math.ceil((pttl > 0 ? pttl : WINDOW_MS) / 1000));
        return { ok: false, retryAfter };
      }
      return { ok: true };
    } catch {
      /* fall through */
    }
  }

  return checkMemoryWithScope(token, request, scopeTier);
}

/** P4-BE-1: best-effort Redis connectivity for `/api/v1/health`. */
export async function getRedisHealth(): Promise<
  { status: "not_configured" } | { status: "ok" } | { status: "error" }
> {
  if (!redisUrl()) {
    return { status: "not_configured" };
  }
  const redis = await getRedis();
  if (!redis) {
    return { status: "error" };
  }
  try {
    const pong = await redis.ping();
    return pong === "PONG" ? { status: "ok" } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
