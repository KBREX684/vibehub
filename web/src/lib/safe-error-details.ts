const isProd = process.env.NODE_ENV === "production";

/**
 * Avoid leaking stack fragments, SQL, or paths in API error payloads (500 responses).
 * In development, still return the message for faster debugging.
 */
export function safeServerErrorDetails(err: unknown): string | undefined {
  if (!isProd) {
    return err instanceof Error ? err.message : String(err);
  }
  return undefined;
}
