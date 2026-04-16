export type RuntimeDataMode = "mock" | "database";

export function hasDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Runtime data strategy:
 * - `USE_MOCK_DATA=true`  -> force mock mode (BLOCKED in production)
 * - `USE_MOCK_DATA=false` -> force database mode
 * - unset                 -> prefer database when configured, otherwise fall back
 *
 * Production hardening (V7-P0-1):
 * In NODE_ENV=production, mock mode is never allowed. If USE_MOCK_DATA=true or
 * DATABASE_URL is missing, the function throws instead of silently degrading.
 * This prevents production from running against fake data.
 *
 * Development/CI behavior is unchanged: mock fallback still works when
 * DATABASE_URL is absent, keeping `npm run check` buildable without Postgres.
 */
export function isMockDataEnabled(): boolean {
  if (process.env.USE_MOCK_DATA === "true") {
    if (isProductionRuntime()) {
      throw new Error(
        "[runtime-mode] USE_MOCK_DATA=true is forbidden in production. " +
        "Production must use a real database. Remove USE_MOCK_DATA or set it to false.",
      );
    }
    return true;
  }
  if (process.env.USE_MOCK_DATA === "false") {
    return false;
  }
  // Unset: prefer database when configured, otherwise fall back to mock
  if (!hasDatabaseUrlConfigured()) {
    if (isProductionRuntime()) {
      throw new Error(
        "[runtime-mode] DATABASE_URL is required in production. " +
        "Cannot implicitly fall back to mock data mode. " +
        "Set DATABASE_URL or explicitly set USE_MOCK_DATA=false.",
      );
    }
    return true;
  }
  return false;
}

export function getRuntimeDataMode(): RuntimeDataMode {
  return isMockDataEnabled() ? "mock" : "database";
}
