import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "../src/lib/auth";

describe("session signing", () => {
  it("decodes a signed session token", () => {
    const token = encodeSession({
      userId: "u1",
      role: "user",
      name: "Alice",
    });

    const decoded = decodeSession(token);
    expect(decoded).toEqual({
      userId: "u1",
      role: "user",
      name: "Alice",
    });
  });

  it("rejects tampered token payload", () => {
    const token = encodeSession({
      userId: "u1",
      role: "user",
      name: "Alice",
    });

    const [payload, signature] = token.split(".");
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    decodedPayload.role = "admin";
    const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload), "utf-8").toString("base64url");
    const tamperedToken = `${tamperedPayload}.${signature}`;

    expect(decodeSession(tamperedToken)).toBeNull();
  });
});
