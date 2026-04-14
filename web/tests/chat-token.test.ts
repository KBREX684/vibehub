import { describe, expect, it } from "vitest";
import { decodeChatToken, encodeChatToken } from "../src/lib/chat-token";

describe("chat token signing", () => {
  it("encodes and decodes valid chat token claims", () => {
    const token = encodeChatToken({
      teamSlug: "vibehub-core",
      userId: "u1",
      userName: "Alice",
    });

    const claims = decodeChatToken(token);
    expect(claims).toBeTruthy();
    expect(claims?.teamSlug).toBe("vibehub-core");
    expect(claims?.userId).toBe("u1");
    expect(claims?.userName).toBe("Alice");
    expect(typeof claims?.exp).toBe("number");
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
});
