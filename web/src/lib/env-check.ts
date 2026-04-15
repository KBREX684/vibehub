/**
 * P4-BE-4: fail fast when `ENFORCE_REQUIRED_ENV=true` (e.g. staging/prod) and secrets are missing.
 */
export function assertProductionEnv(): void {
  if (process.env.ENFORCE_REQUIRED_ENV !== "true") return;
  const missing: string[] = [];
  if (!process.env.SESSION_SECRET?.trim()) missing.push("SESSION_SECRET");
  if (process.env.USE_MOCK_DATA === "false" && !process.env.DATABASE_URL?.trim()) {
    missing.push("DATABASE_URL");
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
