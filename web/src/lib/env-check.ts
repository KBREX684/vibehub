/**
 * P4-BE-4 + V7-P0-2: fail fast when required production secrets are missing.
 *
 * Activation rules:
 * - NODE_ENV=production → always enforced (no opt-in needed)
 * - NODE_ENV!=production + ENFORCE_REQUIRED_ENV=true → enforced (for staging/CI)
 * - NODE_ENV!=production + ENFORCE_REQUIRED_ENV unset → skipped (dev friendly)
 */
export function assertProductionEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const isEnforced = process.env.ENFORCE_REQUIRED_ENV === "true";

  if (!isProduction && !isEnforced) return;

  const missing: string[] = [];

  // --- Core secrets (always required in production) ---
  if (!process.env.SESSION_SECRET?.trim()) {
    missing.push("SESSION_SECRET");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    missing.push("DATABASE_URL");
  }

  // --- Auth: at least one login provider must be configured ---
  const hasGitHub =
    process.env.GITHUB_CLIENT_ID?.trim() &&
    process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!hasGitHub) {
    missing.push("GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET (at least one auth provider required)");
  }

  if (missing.length > 0) {
    throw new Error(
      `[env-check] Missing required environment variables for ${isProduction ? "production" : "enforced"} mode:\n` +
      missing.map((v) => `  - ${v}`).join("\n") +
      "\n\nSet these variables before starting the application.",
    );
  }
}
