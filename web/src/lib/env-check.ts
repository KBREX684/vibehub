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

/**
 * v7 P0-3: any production Node process must have a real database URL (mock is disabled when NODE_ENV=production).
 */
export function assertProductionDatabaseConfigured(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required when NODE_ENV=production (mock data is disabled in production)");
  }
  if (!process.env.SESSION_SECRET?.trim()) {
    throw new Error("SESSION_SECRET is required when NODE_ENV=production");
  }
}
