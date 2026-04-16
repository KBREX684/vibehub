/**
 * P3-INFRA-2: Zod-based environment variable validation.
 *
 * Called once from `instrumentation.ts` at server startup.
 * In enforcement mode (`ENFORCE_REQUIRED_ENV=true`) missing required variables
 * cause an immediate hard failure with structured error output.
 *
 * In development / test the check is permissive — it only warns to stderr.
 */
import { envSchema } from "@/lib/env-schema";

let _validated = false;

export function assertProductionEnv(): void {
  if (_validated) return;
  _validated = true;

  const result = envSchema.safeParse(process.env);

  if (result.success) return;

  const enforcing = process.env.ENFORCE_REQUIRED_ENV === "true";
  const formatted = result.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");

  if (enforcing) {
    throw new Error(
      `Environment validation failed (ENFORCE_REQUIRED_ENV=true):\n${formatted}`
    );
  }

  // Non-enforcing: log a warning but don't crash.
  // eslint-disable-next-line no-console
  console.warn(
    `[env-check] Validation issues (non-fatal in dev):\n${formatted}`
  );
}
