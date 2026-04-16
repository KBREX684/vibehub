/**
 * Safely parse an integer query parameter with NaN protection and min/max clamping.
 *
 * @param raw       Raw string value from `searchParams.get()`, or null/undefined.
 * @param fallback  Default value when raw is null/undefined or not a finite number.
 * @param min       Minimum allowed value (inclusive, default 1).
 * @param max       Maximum allowed value (inclusive, default 500).
 * @returns         A finite integer within [min, max], or the fallback.
 */
export function safeParseIntParam(
  raw: string | null | undefined,
  fallback: number,
  min = 1,
  max = 500,
): number {
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
