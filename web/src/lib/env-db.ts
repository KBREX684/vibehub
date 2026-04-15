/** True when a non-empty DATABASE_URL is configured (real DB, not empty mock). */
export function hasConfiguredDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
