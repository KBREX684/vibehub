import { describe, expect, it, afterEach, vi } from "vitest";

/**
 * V7-P0-1: runtime-mode.ts production hardening tests
 *
 * Verifies that:
 * - Production (NODE_ENV=production) never silently falls back to mock mode
 * - Development/CI behavior remains unchanged
 */

function loadModule() {
  // Force re-import to pick up changed env vars
  vi.resetModules();
  return import("../src/lib/runtime-mode");
}

describe("runtime-mode production hardening (V7-P0-1)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  // --- Production guards ---

  it("throws when USE_MOCK_DATA=true in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.USE_MOCK_DATA = "true";
    const mod = await loadModule();
    expect(() => mod.isMockDataEnabled()).toThrow("forbidden in production");
  });

  it("throws when DATABASE_URL is missing and USE_MOCK_DATA is unset in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.USE_MOCK_DATA;
    delete process.env.DATABASE_URL;
    const mod = await loadModule();
    expect(() => mod.isMockDataEnabled()).toThrow("DATABASE_URL is required in production");
  });

  it("allows database mode in production with DATABASE_URL set", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.USE_MOCK_DATA;
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    const mod = await loadModule();
    expect(mod.isMockDataEnabled()).toBe(false);
    expect(mod.getRuntimeDataMode()).toBe("database");
  });

  it("allows explicit USE_MOCK_DATA=false in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.USE_MOCK_DATA = "false";
    delete process.env.DATABASE_URL;
    const mod = await loadModule();
    expect(mod.isMockDataEnabled()).toBe(false);
  });

  // --- Development/CI backward compatibility ---

  it("allows mock fallback in development when DATABASE_URL is missing", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.USE_MOCK_DATA;
    delete process.env.DATABASE_URL;
    const mod = await loadModule();
    expect(mod.isMockDataEnabled()).toBe(true);
    expect(mod.getRuntimeDataMode()).toBe("mock");
  });

  it("allows USE_MOCK_DATA=true in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.USE_MOCK_DATA = "true";
    const mod = await loadModule();
    expect(mod.isMockDataEnabled()).toBe(true);
  });

  it("prefers database when DATABASE_URL is set in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.USE_MOCK_DATA;
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    const mod = await loadModule();
    expect(mod.isMockDataEnabled()).toBe(false);
  });

  it("allows mock fallback in test mode (CI)", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.USE_MOCK_DATA;
    delete process.env.DATABASE_URL;
    const mod = await loadModule();
    expect(mod.isMockDataEnabled()).toBe(true);
  });

  // --- Edge cases ---

  it("handles whitespace-only DATABASE_URL as missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.USE_MOCK_DATA;
    process.env.DATABASE_URL = "   ";
    const mod = await loadModule();
    expect(() => mod.isMockDataEnabled()).toThrow("DATABASE_URL is required in production");
  });

  it("hasDatabaseUrlConfigured returns false for empty string", async () => {
    process.env.DATABASE_URL = "";
    const mod = await loadModule();
    expect(mod.hasDatabaseUrlConfigured()).toBe(false);
  });

  it("hasDatabaseUrlConfigured returns true for valid URL", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/vibehub";
    const mod = await loadModule();
    expect(mod.hasDatabaseUrlConfigured()).toBe(true);
  });
});
