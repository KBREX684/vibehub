import { describe, expect, it } from "vitest";
import {
  createUserOAuthApp,
  exchangeOAuthAuthorizationCode,
  getSessionUserFromOAuthAccessToken,
  issueOAuthAuthorizationCode,
  listUserOAuthApps,
} from "../src/lib/repositories/oauth-app.repository";

describe("oauth apps (P3-2 mock)", () => {
  it("creates and lists oauth apps", async () => {
    const created = await createUserOAuthApp({
      userId: "u1",
      name: "Local Desktop Client",
      redirectUris: ["http://localhost:3001/callback"],
      scopes: ["read:public", "read:projects:list"],
    });
    expect(created.clientSecret.startsWith("vhs_")).toBe(true);
    const apps = await listUserOAuthApps("u1");
    expect(apps.some((app) => app.id === created.id)).toBe(true);
  });

  it("issues code, exchanges token, and authenticates bearer session", async () => {
    const app = await createUserOAuthApp({
      userId: "u1",
      name: "CLI Helper",
      redirectUris: ["http://localhost:3010/callback"],
      scopes: ["read:public", "read:projects:list"],
    });
    const code = await issueOAuthAuthorizationCode({
      clientId: app.clientId,
      userId: "u1",
      redirectUri: "http://localhost:3010/callback",
      scopes: ["read:public", "read:projects:list"],
    });
    const token = await exchangeOAuthAuthorizationCode({
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      code,
      redirectUri: "http://localhost:3010/callback",
    });
    expect(token.accessToken.startsWith("vho_")).toBe(true);
    const session = await getSessionUserFromOAuthAccessToken(token.accessToken);
    expect(session?.userId).toBe("u1");
    expect(session?.oauthAppClientId).toBe(app.clientId);
    expect(session?.apiKeyScopes).toContain("read:projects:list");
  });
});
