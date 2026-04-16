export type RuntimeDataMode = "mock" | "database";

export function hasDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** True when running a production Next.js build (`next build` / `next start`). */
export function isNextProductionPhase(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * True only for production runtime processes, not for `next build`.
 * We still allow mock-backed static generation in local/CI builds when no
 * database is configured, but production servers must never use mock data.
 */
export function isProductionRuntimeProcess(): boolean {
  return isNextProductionPhase() && process.env.NEXT_PHASE !== "phase-production-build";
}

/**
 * Runtime data strategy (v7 P0-3):
 * - In **production runtime** (`next start`, ws-server, mcp-server), mock data is **never** used.
 * - In local/CI `next build`, mock-backed static generation is still allowed when no DB is configured.
 * - `USE_MOCK_DATA=true`  -> force mock mode (development/test only)
 * - `USE_MOCK_DATA=false` -> force database mode
 * - unset                 -> prefer database when configured, otherwise fall back to mock (local dev without Postgres)
 */
export function isMockDataEnabled(): boolean {
  if (isProductionRuntimeProcess()) {
    return false;
  }
  if (process.env.USE_MOCK_DATA === "true") {
    return true;
  }
  if (process.env.USE_MOCK_DATA === "false") {
    return false;
  }
  return !hasDatabaseUrlConfigured();
}

export function getRuntimeDataMode(): RuntimeDataMode {
  return isMockDataEnabled() ? "mock" : "database";
}
