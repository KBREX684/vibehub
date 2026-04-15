import { describe, expect, it } from "vitest";
import { createUserWebhook, deleteUserWebhook, listUserWebhooks } from "../src/lib/repository";

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
});
