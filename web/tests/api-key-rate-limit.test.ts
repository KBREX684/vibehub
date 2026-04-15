import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { checkApiKeyRateLimit } from "../src/lib/api-key-rate-limit";

describe("api-key-rate-limit", () => {
  it("returns ok false after exceeding limit in the same window", () => {
    const prev = process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
    process.env.API_KEY_RATE_LIMIT_PER_MINUTE = "3";
    try {
      const req = new NextRequest("http://localhost/test");
      const token = `vh_rltest_${Math.random().toString(36).slice(2)}`;
      expect(checkApiKeyRateLimit(token, req).ok).toBe(true);
      expect(checkApiKeyRateLimit(token, req).ok).toBe(true);
      expect(checkApiKeyRateLimit(token, req).ok).toBe(true);
      const fourth = checkApiKeyRateLimit(token, req);
      expect(fourth.ok).toBe(false);
      if (!fourth.ok) {
        expect(fourth.retryAfter).toBeGreaterThan(0);
      }
    } finally {
      if (prev !== undefined) {
        process.env.API_KEY_RATE_LIMIT_PER_MINUTE = prev;
      } else {
        delete process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
      }
    }
  });
});
