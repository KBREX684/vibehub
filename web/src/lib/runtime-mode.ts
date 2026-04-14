export type RuntimeDataMode = "mock" | "database";

export function hasDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Runtime data strategy:
 * - `USE_MOCK_DATA=true`  -> force mock mode
 * - `USE_MOCK_DATA=false` -> force database mode
 * - unset                 -> prefer database when configured, otherwise fall back
 *
 * This keeps `npm run check` buildable in cloud/dev environments that do not
 * provision PostgreSQL, while real DB + seed remains the primary verification
 * path via explicit environment setup and `npm run smoke:live-data`.
 */
export function isMockDataEnabled(): boolean {
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
