import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "../src/lib/webhook-signature";

describe("webhook signature", () => {
  it("signs payloads with HMAC-SHA256 and verifies the result", () => {
    const secret = "super-secret";
    const body = JSON.stringify({ event: "post.created", id: "p1" });
    const signature = signWebhookPayload(secret, body);
    expect(signature).toHaveLength(64);
    expect(verifyWebhookSignature(secret, body, `sha256=${signature}`)).toBe(true);
  });

  it("rejects tampered payloads", () => {
    const secret = "super-secret";
    const body = JSON.stringify({ event: "post.created", id: "p1" });
    const signature = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, JSON.stringify({ event: "post.created", id: "p2" }), `sha256=${signature}`)).toBe(false);
  });
});
