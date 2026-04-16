import { describe, expect, it, afterEach, vi } from "vitest";

/**
 * V7-P0-2: env-check.ts production hardening tests
 *
 * Verifies that:
 * - Production mode (NODE_ENV=production) auto-enforces env validation
 * - Non-production mode respects ENFORCE_REQUIRED_ENV flag
 * - All required variables are checked
 */

async function loadAndAssert() {
  vi.resetModules();
  const mod = await import("../src/lib/env-check");
  return mod.assertProductionEnv;
}

describe("env-check production hardening (V7-P0-2)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // --- Production auto-enforcement ---

  it("throws in production when SESSION_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENFORCE_REQUIRED_ENV;
    delete process.env.SESSION_SECRET;
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    const fn = await loadAndAssert();
    expect(() => fn()).toThrow("SESSION_SECRET");
  });

  it("throws in production when DATABASE_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENFORCE_REQUIRED_ENV;
    process.env.SESSION_SECRET = "a-long-secret";
    delete process.env.DATABASE_URL;
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    const fn = await loadAndAssert();
    expect(() => fn()).toThrow("DATABASE_URL");
  });

  it("throws in production when GitHub OAuth credentials are missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENFORCE_REQUIRED_ENV;
    process.env.SESSION_SECRET = "a-long-secret";
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    const fn = await loadAndAssert();
    expect(() => fn()).toThrow("GITHUB_CLIENT_ID");
  });

  it("does NOT throw in production when all required vars are present", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENFORCE_REQUIRED_ENV;
    process.env.SESSION_SECRET = "a-long-secret";
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    const fn = await loadAndAssert();
    expect(() => fn()).not.toThrow();
  });

  it("lists all missing variables in a single error", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    const fn = await loadAndAssert();
    try {
      fn();
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain("SESSION_SECRET");
      expect(msg).toContain("DATABASE_URL");
      expect(msg).toContain("GITHUB_CLIENT_ID");
    }
  });

  // --- ENFORCE_REQUIRED_ENV flag for non-production ---

  it("enforces validation in non-production when ENFORCE_REQUIRED_ENV=true", async () => {
    process.env.NODE_ENV = "development";
    process.env.ENFORCE_REQUIRED_ENV = "true";
    delete process.env.SESSION_SECRET;
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    const fn = await loadAndAssert();
    expect(() => fn()).toThrow("SESSION_SECRET");
  });

  it("skips validation in non-production when ENFORCE_REQUIRED_ENV is unset", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ENFORCE_REQUIRED_ENV;
    delete process.env.SESSION_SECRET;
    delete process.env.DATABASE_URL;
    const fn = await loadAndAssert();
    expect(() => fn()).not.toThrow();
  });

  it("skips validation in test mode when ENFORCE_REQUIRED_ENV is unset", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.ENFORCE_REQUIRED_ENV;
    delete process.env.SESSION_SECRET;
    const fn = await loadAndAssert();
    expect(() => fn()).not.toThrow();
  });

  // --- Edge cases ---

  it("treats whitespace-only SESSION_SECRET as missing", async () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "   ";
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    const fn = await loadAndAssert();
    expect(() => fn()).toThrow("SESSION_SECRET");
  });

  it("treats whitespace-only DATABASE_URL as missing", async () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-long-secret";
    process.env.DATABASE_URL = "  ";
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    const fn = await loadAndAssert();
    expect(() => fn()).toThrow("DATABASE_URL");
  });
});
