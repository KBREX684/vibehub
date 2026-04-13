import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { signNotificationWebhookBody } from "../src/lib/push-dispatcher";

describe("signNotificationWebhookBody", () => {
  it("matches Node crypto HMAC-SHA256 over raw body bytes", () => {
    const secret = "test-secret";
    const body = '{"a":1}';
    const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(signNotificationWebhookBody(secret, body)).toBe(expected);
  });
});
