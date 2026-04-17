import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "../src/lib/auth";
import { createHmac } from "crypto";

describe("session signing", () => {
  const secret = "dev-session-secret-change-me";
  const originalSessionSecret = process.env.SESSION_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.SESSION_SECRET = secret;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

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
      sessionVersion: 0,
    });
  });

  it("round-trips optional enterprise fields", () => {
    const token = encodeSession({
      userId: "u1",
      role: "user",
      name: "Alice",
      enterpriseStatus: "approved",
      enterpriseOrganization: "Acme",
      enterpriseWebsite: "https://acme.example",
    });
    expect(decodeSession(token)).toEqual({
      userId: "u1",
      role: "user",
      name: "Alice",
      sessionVersion: 0,
      enterpriseStatus: "approved",
      enterpriseOrganization: "Acme",
      enterpriseWebsite: "https://acme.example",
    });
  });

  it("drops legacy subscription tiers that are no longer supported", () => {
    const token = encodeSession({
      userId: "u1",
      role: "user",
      name: "Alice",
      subscriptionTier: "pro",
    });
    const [payload, signature] = token.split(".");
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    decodedPayload.subscriptionTier = "team_pro";
    const legacyPayload = Buffer.from(JSON.stringify(decodedPayload), "utf-8").toString("base64url");
    const legacySignature = createHmac("sha256", secret)
      .update(legacyPayload)
      .digest("base64url");

    expect(signature).toBeTruthy();
    expect(decodeSession(`${legacyPayload}.${legacySignature}`)).toEqual({
      userId: "u1",
      role: "user",
      name: "Alice",
      sessionVersion: 0,
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
