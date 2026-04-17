import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodeChatToken, encodeChatToken } from "../src/lib/chat-token";

describe("chat token signing", () => {
  const originalChatSecret = process.env.CHAT_WS_TOKEN_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const secret = "dev-chat-token-secret-change-me";

  beforeEach(() => {
    process.env.CHAT_WS_TOKEN_SECRET = secret;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalChatSecret === undefined) delete process.env.CHAT_WS_TOKEN_SECRET;
    else process.env.CHAT_WS_TOKEN_SECRET = originalChatSecret;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("encodes and decodes valid chat token claims", () => {
    const token = encodeChatToken({
      teamSlug: "vibehub-core",
      userId: "u1",
      userName: "Alice",
    });

    const decoded = decodeChatToken(token);
    expect(decoded).toBeTruthy();
    expect(decoded?.teamSlug).toBe("vibehub-core");
    expect(decoded?.userId).toBe("u1");
    expect(decoded?.userName).toBe("Alice");
    expect(typeof decoded?.exp).toBe("number");
  });

  it("rejects tampered tokens", () => {
    const token = encodeChatToken({
      teamSlug: "vibehub-core",
      userId: "u1",
      userName: "Alice",
    });
    const tampered = `${token}x`;
    expect(decodeChatToken(tampered)).toBeNull();
  });

  it("returns null on missing token", () => {
    expect(decodeChatToken(undefined)).toBeNull();
  });
});
