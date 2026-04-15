import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { checkApiKeyRateLimitMemory } from "../src/lib/redis-rate-limit";

describe("P2 medium: api key scope rate limits", () => {
  it("applies stricter write and looser read_public windows", () => {
    const prevRead = process.env.API_KEY_RATE_LIMIT_PER_MINUTE_READ_PUBLIC;
    const prevWrite = process.env.API_KEY_RATE_LIMIT_PER_MINUTE_WRITE;
    process.env.API_KEY_RATE_LIMIT_PER_MINUTE_READ_PUBLIC = "4";
    process.env.API_KEY_RATE_LIMIT_PER_MINUTE_WRITE = "2";

    try {
      const req = new NextRequest("http://localhost/test");
      const token = `vh_scope_${Math.random().toString(36).slice(2)}`;

      expect(checkApiKeyRateLimitMemory(token, req, "write").ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req, "write").ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req, "write").ok).toBe(false);

      expect(checkApiKeyRateLimitMemory(token, req, "read_public").ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req, "read_public").ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req, "read_public").ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req, "read_public").ok).toBe(true);
      expect(checkApiKeyRateLimitMemory(token, req, "read_public").ok).toBe(false);
    } finally {
      if (prevRead !== undefined) process.env.API_KEY_RATE_LIMIT_PER_MINUTE_READ_PUBLIC = prevRead;
      else delete process.env.API_KEY_RATE_LIMIT_PER_MINUTE_READ_PUBLIC;
      if (prevWrite !== undefined) process.env.API_KEY_RATE_LIMIT_PER_MINUTE_WRITE = prevWrite;
      else delete process.env.API_KEY_RATE_LIMIT_PER_MINUTE_WRITE;
    }
  });
});
