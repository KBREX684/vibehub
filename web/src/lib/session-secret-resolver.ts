import { hasConfiguredDatabaseUrl } from "@/lib/env-db";

/**
 * Shared by Node auth and Edge middleware — same rules as legacy getSessionSecret.
 * G-04: In production, missing SESSION_SECRET is a hard error — no dev fallback.
 */
export function resolveSessionSigningSecret(): string | null {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  // G-04: Production must never use dev fallback secret
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[G-04] SESSION_SECRET is required in production. " +
        "Refusing to use dev fallback secret."
    );
  }
  if (!hasConfiguredDatabaseUrl()) {
    return "dev-session-secret-change-me";
  }
  return null;
}
