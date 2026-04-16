export type RuntimeDataMode = "mock" | "database";

export function hasDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** True when running a production Next.js build (`next build` / `next start`). */
export function isNextProductionPhase(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Runtime data strategy (v7 P0-3):
 * - In **production** (`NODE_ENV=production`), mock data is **never** used — all paths use PostgreSQL.
 * - `USE_MOCK_DATA=true`  -> force mock mode (development/test only)
 * - `USE_MOCK_DATA=false` -> force database mode
 * - unset                 -> prefer database when configured, otherwise fall back to mock (local dev without Postgres)
 */
export function isMockDataEnabled(): boolean {
  if (isNextProductionPhase()) {
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
