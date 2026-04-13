import type { NextRequest } from "next/server";
import { checkApiKeyRateLimitMemory, clientIp, rateLimitKeyForToken } from "@/lib/redis-rate-limit";

export { clientIp, rateLimitKeyForToken };

/** @deprecated Prefer `checkApiKeyRateLimitAsync` from `@/lib/redis-rate-limit` in async paths (Redis when configured). */
export function checkApiKeyRateLimit(
  token: string,
  request: NextRequest
): { ok: true } | { ok: false; retryAfter: number } {
  return checkApiKeyRateLimitMemory(token, request);
}
