import { describe, expect, it } from "vitest";
import { enforceAuthActionRateLimit } from "../src/lib/auth-rate-limit";

describe("auth action rate limiting", () => {
  it("limits repeated login attempts for the same identity", async () => {
    const request = new Request("http://localhost/api/v1/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    for (let i = 0; i < 10; i += 1) {
      const result = await enforceAuthActionRateLimit({
        request,
        action: "login",
        identity: "user@example.com",
      });
      expect(result.ok).toBe(true);
    }

    const blocked = await enforceAuthActionRateLimit({
      request,
      action: "login",
      identity: "user@example.com",
    });
    expect(blocked.ok).toBe(false);
  });
});
