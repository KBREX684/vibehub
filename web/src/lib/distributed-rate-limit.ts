import { getRedisClient, hasRedisConfigured, isProductionLikeInfra } from "@/lib/redis";

const DEFAULT_WINDOW_MS = 60_000;
const LUA_INCR_WINDOW = `
local c = redis.call("INCR", KEYS[1])
if c == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return c
`;

type Bucket = { count: number; windowStart: number };
const memoryBuckets = new Map<string, Bucket>();

function checkMemory(bucketKey: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  let bucket = memoryBuckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    memoryBuckets.set(bucketKey, bucket);
  }
  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return {
      ok: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000)),
      backend: "memory_fallback" as const,
    };
  }
  if (memoryBuckets.size > 50_000) {
    for (const [key, value] of memoryBuckets) {
      if (now - value.windowStart >= windowMs * 2) {
        memoryBuckets.delete(key);
      }
    }
  }
  return { ok: true as const, backend: "memory_fallback" as const };
}

export async function checkDistributedRateLimit(params: {
  bucketKey: string;
  maxRequests: number;
  windowMs?: number;
}): Promise<
  | { ok: true; backend: "redis" | "memory_fallback" }
  | { ok: false; retryAfterSeconds: number; backend: "redis" | "memory_fallback" }
> {
  const windowMs = params.windowMs ?? DEFAULT_WINDOW_MS;
  const redis = await getRedisClient();
  if (redis) {
    try {
      const now = Date.now();
      const windowId = Math.floor(now / windowMs);
      const redisKey = `ratelimit:${params.bucketKey}:${windowId}`;
      const count = (await redis.eval(LUA_INCR_WINDOW, 1, redisKey, String(windowMs))) as number;
      if (count > params.maxRequests) {
        const pttl = await redis.pttl(redisKey);
        return {
          ok: false,
          retryAfterSeconds: Math.max(1, Math.ceil((pttl > 0 ? pttl : windowMs) / 1000)),
          backend: "redis",
        };
      }
      return { ok: true, backend: "redis" };
    } catch {
      return checkMemory(params.bucketKey, params.maxRequests, windowMs);
    }
  }
  return checkMemory(params.bucketKey, params.maxRequests, windowMs);
}

export function shouldTreatMissingRedisAsDegraded(): boolean {
  return isProductionLikeInfra() && !hasRedisConfigured();
}
