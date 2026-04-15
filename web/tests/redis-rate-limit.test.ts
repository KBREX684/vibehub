import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { checkApiKeyRateLimitAsync, checkApiKeyRateLimitMemory } from "../src/lib/redis-rate-limit";

describe("redis-rate-limit (memory path)", () => {
  it("checkApiKeyRateLimitMemory matches small limit", () => {
    const prev = process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
    process.env.API_KEY_RATE_LIMIT_PER_MINUTE = "2";
    try {
      const req = new NextRequest("http://localhost/test");
      const token = `vh_mem_${Math.random().toString(36).slice(2)}`;
      expect(checkApiKeyRateLimitMemory(token, req).ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req).ok).toBe(true);
      const third = checkApiKeyRateLimitMemory(token, req);
      expect(third.ok).toBe(false);
    } finally {
      if (prev !== undefined) {
        process.env.API_KEY_RATE_LIMIT_PER_MINUTE = prev;
      } else {
        delete process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
      }
    }
  });

  it("checkApiKeyRateLimitAsync falls back to memory without REDIS_URL", async () => {
    const prevRl = process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
    const prevRedis = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    process.env.API_KEY_RATE_LIMIT_PER_MINUTE = "2";
    try {
      const req = new NextRequest("http://localhost/test");
      const token = `vh_async_${Math.random().toString(36).slice(2)}`;
      expect((await checkApiKeyRateLimitAsync(token, req)).ok).toBe(true);
      expect((await checkApiKeyRateLimitAsync(token, req)).ok).toBe(true);
      const third = await checkApiKeyRateLimitAsync(token, req);
      expect(third.ok).toBe(false);
    } finally {
      if (prevRl !== undefined) {
        process.env.API_KEY_RATE_LIMIT_PER_MINUTE = prevRl;
      } else {
        delete process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
      }
      if (prevRedis !== undefined) {
        process.env.REDIS_URL = prevRedis;
      }
    }
  });
});
