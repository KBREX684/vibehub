import { describe, expect, it } from "vitest";
import { createUserWebhook, deleteUserWebhook, getUserWebhookSecret, listUserWebhooks } from "../src/lib/repository";
import { mockWebhookEndpoints } from "../src/lib/data/mock-data";

describe("user webhooks (P3-3 mock)", () => {
  it("rejects private-network webhook URLs", async () => {
    await expect(
      createUserWebhook({
        userId: "u1",
        url: "https://127.0.0.1/hook",
        events: ["post.created"],
      })
    ).rejects.toThrow("WEBHOOK_URL_BLOCKED");
  });

  it("creates lists and deletes", async () => {
    const created = await createUserWebhook({
      userId: "u1",
      url: "https://example.com/hook",
      events: ["post.created"],
    });
    expect(created.secret.length).toBeGreaterThan(10);
    const list = await listUserWebhooks("u1");
    expect(list.some((w) => w.id === created.id)).toBe(true);
    await deleteUserWebhook({ userId: "u1", webhookId: created.id });
    const after = await listUserWebhooks("u1");
    expect(after.some((w) => w.id === created.id)).toBe(false);
  });

  it("stores webhook secrets encrypted at rest but returns plaintext on demand", async () => {
    const created = await createUserWebhook({
      userId: "u1",
      url: "https://example.com/hook-secure",
      events: ["post.created"],
    });
    const stored = mockWebhookEndpoints.find((item) => item.id === created.id);
    expect(stored?.secret.startsWith("enc:v1:")).toBe(true);
    const plaintext = await getUserWebhookSecret({ userId: "u1", webhookId: created.id });
    expect(plaintext).toBe(created.secret);
  });
});
