/**
 * G-04: fail fast when `NODE_ENV=production` or `ENFORCE_REQUIRED_ENV=true`.
 * Production automatically activates checks — no manual flag needed.
 */
export function assertProductionEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const enforced = process.env.ENFORCE_REQUIRED_ENV === "true";
  if (!isProduction && !enforced) return;

  const missing: string[] = [];
  if (!process.env.SESSION_SECRET?.trim()) missing.push("SESSION_SECRET");
  if (!process.env.DATABASE_URL?.trim()) {
    // In production, DATABASE_URL is always required (G-03 also blocks mock fallback)
    if (process.env.USE_MOCK_DATA !== "true") {
      missing.push("DATABASE_URL");
    }
  }
  // G-04: API_KEY_HASH_PEPPER must be set if API Key functionality is available
  if (!process.env.API_KEY_HASH_PEPPER?.trim()) {
    missing.push("API_KEY_HASH_PEPPER");
  }
  if (missing.length > 0) {
    throw new Error(
      `[G-04] Missing required environment variables for production: ${missing.join(", ")}. ` +
        "Application refuses to start in an insecure configuration."
    );
  }
}
