import { describe, expect, it } from "vitest";
import {
  createApiKeyForUser,
  getSessionUserFromApiKeyToken,
  listApiKeysForUser,
  listAuditLogs,
  listTeamsForUser,
  revokeApiKeyForUser,
} from "../src/lib/repository";

describe("API keys (P4-1, mock)", () => {
  it("creates lists and revokes; bearer resolves to user session shape", async () => {
    const created = await createApiKeyForUser({ userId: "u1", label: "CI key" });
    expect(created.secret.startsWith("vh_")).toBe(true);
    expect(created.prefix.startsWith("vh_")).toBe(true);
    expect(created.scopes.includes("read:public")).toBe(true);

    const list = await listApiKeysForUser("u1");
    expect(list.some((k) => k.id === created.id)).toBe(true);

    const session = await getSessionUserFromApiKeyToken(created.secret);
    expect(session?.userId).toBe("u1");
    expect(session?.apiKeyScopes?.length).toBeGreaterThan(0);
    expect(session?.apiKeyId).toBe(created.id);

    const teams = await listTeamsForUser(session!.userId);
    expect(teams.length).toBeGreaterThan(0);

    await revokeApiKeyForUser({ userId: "u1", keyId: created.id });
    await expect(getSessionUserFromApiKeyToken(created.secret)).resolves.toBeNull();
    const logs = await listAuditLogs({ page: 1, limit: 50 });
    expect(logs.items.some((x) => x.action === "api_key_revoked" && x.entityId === created.id)).toBe(true);
  });

  it("rejects invalid scopes on create", async () => {
    await expect(
      createApiKeyForUser({
        userId: "u1",
        label: "bad",
        scopes: ["read:public", "not-a-real-scope"],
      })
    ).rejects.toThrow("INVALID_API_KEY_SCOPE");
  });

  it("rejects revoke twice", async () => {
    const c = await createApiKeyForUser({ userId: "u2", label: "temp" });
    await revokeApiKeyForUser({ userId: "u2", keyId: c.id });
    await expect(revokeApiKeyForUser({ userId: "u2", keyId: c.id })).rejects.toThrow("API_KEY_NOT_FOUND");
  });
});
