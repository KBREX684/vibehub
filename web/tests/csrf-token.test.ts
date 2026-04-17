import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { deriveCsrfToken, encodeSession } from "../src/lib/auth";

describe("CSRF token derivation (P0-BE-2)", () => {
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

  it("returns a 32-char base64url string for a valid session cookie", () => {
    const sessionToken = encodeSession({ userId: "u1", role: "user", name: "Alice" });
    const csrf = deriveCsrfToken(sessionToken);
    expect(csrf).not.toBeNull();
    expect(csrf!.length).toBe(32);
    expect(/^[A-Za-z0-9_-]+$/.test(csrf!)).toBe(true);
  });

  it("returns null for an empty raw session string", () => {
    expect(deriveCsrfToken("")).toBeNull();
  });

  it("produces different tokens for different session cookies", () => {
    const t1 = encodeSession({ userId: "u1", role: "user", name: "Alice" });
    const t2 = encodeSession({ userId: "u2", role: "user", name: "Bob" });
    expect(deriveCsrfToken(t1)).not.toBe(deriveCsrfToken(t2));
  });

  it("matches the expected HMAC-SHA256 derivation formula", () => {
    const sessionToken = encodeSession({ userId: "u1", role: "user", name: "Alice" });
    const expected = createHmac("sha256", secret)
      .update(`csrf:${sessionToken}`)
      .digest("base64url")
      .slice(0, 32);
    expect(deriveCsrfToken(sessionToken)).toBe(expected);
  });

  it("is deterministic — same input always gives same token", () => {
    const sessionToken = encodeSession({ userId: "u1", role: "user", name: "Alice" });
    expect(deriveCsrfToken(sessionToken)).toBe(deriveCsrfToken(sessionToken));
  });
});
