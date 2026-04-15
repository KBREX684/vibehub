import { describe, expect, it } from "vitest";
import { tryRegisterMcpInvokeIdempotency } from "../src/lib/repository";

describe("MCP idempotency mock (P3-1)", () => {
  it("returns false on duplicate key for same user+tool", async () => {
    const first = await tryRegisterMcpInvokeIdempotency({ userId: "u1", tool: "create_post", key: "idem-test-12345678" });
    const second = await tryRegisterMcpInvokeIdempotency({ userId: "u1", tool: "create_post", key: "idem-test-12345678" });
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
