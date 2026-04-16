import { randomBytes } from "node:crypto";

/**
 * Generate a cryptographically secure random alphanumeric suffix.
 *
 * Uses `crypto.randomBytes` (server-side) to produce IDs that are
 * infeasible to enumerate, replacing the previous `Math.random().toString(36)`
 * pattern which only offered ~2.1 billion possibilities.
 *
 * @param length  Number of random characters (default 12, base-36 → ~62 bits of entropy).
 * @returns       A lower-case alphanumeric string of the requested length.
 */
export function cryptoRandomSuffix(length = 12): string {
  // We need `length` base-36 characters. Each character carries ~5.17 bits of entropy
  // (log2(36) ≈ 5.17). We approximate with 6 bits/char → need ceil(length * 6 / 8)
  // bytes from crypto.randomBytes, plus safety bytes to handle BigInt→base36
  // conversion boundary effects (the leading digits may be shorter).
  const SAFETY_BYTES = 2;
  const bytes = randomBytes(Math.ceil((length * 6) / 8) + SAFETY_BYTES);
  return BigInt(`0x${bytes.toString("hex")}`).toString(36).slice(0, length);
}

/**
 * Build a prefixed ID with a timestamp and cryptographic random suffix.
 *
 * Example: `cryptoId("n", 8)` → `"n_1713250000000_a3k9xm2p"`
 *
 * @param prefix  Short prefix indicating entity type (e.g. "n" for notification).
 * @param length  Length of the random suffix (default 12).
 */
export function cryptoId(prefix: string, length = 12): string {
  return `${prefix}_${Date.now()}_${cryptoRandomSuffix(length)}`;
}
