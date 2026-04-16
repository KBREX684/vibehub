function shouldEnforceRuntimeEnv(): boolean {
  return process.env.NODE_ENV === "production" || process.env.ENFORCE_REQUIRED_ENV === "true";
}

export function isProductionLikeEnv(): boolean {
  return shouldEnforceRuntimeEnv();
}

/**
 * v7 P0-3/P0-12: every production-like process must fail fast when secrets are
 * missing or mock data is still forced on.
 */
export function assertProductionEnv(service = "runtime"): void {
  if (!shouldEnforceRuntimeEnv()) return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.SESSION_SECRET?.trim()) missing.push("SESSION_SECRET");

  if (process.env.USE_MOCK_DATA === "true") {
    throw new Error(`[${service}] USE_MOCK_DATA=true is not allowed in production-like environments`);
  }

  if (missing.length > 0) {
    throw new Error(`[${service}] Missing required environment variables: ${missing.join(", ")}`);
  }
}

/**
 * Kept as a compatibility helper for existing call sites that only care about
 * the production database/session requirement.
 */
export function assertProductionDatabaseConfigured(service = "runtime"): void {
  if (process.env.NODE_ENV !== "production") return;
  assertProductionEnv(service);
}
