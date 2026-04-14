import { hasConfiguredDatabaseUrl } from "@/lib/env-db";

/** Shared by Node auth and Edge middleware — same rules as legacy getSessionSecret. */
export function resolveSessionSigningSecret(): string | null {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV !== "production" && !hasConfiguredDatabaseUrl()) {
    return "dev-session-secret-change-me";
  }
  return null;
}
