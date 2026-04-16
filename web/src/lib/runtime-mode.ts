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
 * G-03: In production, unset `USE_MOCK_DATA` with missing `DATABASE_URL` is
 * a hard error — no silent mock fallback allowed.
 *
 * This keeps `npm run check` buildable in cloud/dev environments that do not
 * provision PostgreSQL, while real DB + seed remains the primary verification
 * path via explicit environment setup and `npm run smoke:live-data`.
 */
export function isMockDataEnabled(): boolean {
  if (process.env.USE_MOCK_DATA === "true") {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[CRITICAL] USE_MOCK_DATA=true in production — mock data is not allowed in production."
      );
    }
    return true;
  }
  if (process.env.USE_MOCK_DATA === "false") {
    return false;
  }
  // G-03: In production, missing DATABASE_URL with unset USE_MOCK_DATA must fail-fast
  if (process.env.NODE_ENV === "production" && !hasDatabaseUrlConfigured()) {
    throw new Error(
      "Production requires DATABASE_URL when USE_MOCK_DATA is not explicitly set. " +
        "Refusing to silently fall back to mock data."
    );
  }
  return !hasDatabaseUrlConfigured();
}

export function getRuntimeDataMode(): RuntimeDataMode {
  return isMockDataEnabled() ? "mock" : "database";
}
