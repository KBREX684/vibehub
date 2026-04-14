/**
 * P2-2: per-user per-tool sliding window for MCP v2 invoke (complements per-key HTTP rate limit).
 * In-memory only — sufficient for single-instance; Redis extension can mirror api-key path later.
 */

const WINDOW_MS = 60_000;

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

function maxPerWindow(): number {
  const raw = process.env.MCP_USER_TOOL_MAX_PER_MINUTE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function bucketKey(userId: string, tool: string): string {
  return `${userId}::${tool}`;
}

export function checkMcpUserToolRateLimit(userId: string, tool: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const max = maxPerWindow();
  const key = bucketKey(userId, tool);
  let b = buckets.get(key);
  if (!b) {
    b = { timestamps: [] };
    buckets.set(key, b);
  }
  const cutoff = now - WINDOW_MS;
  b.timestamps = b.timestamps.filter((t) => t > cutoff);
  if (b.timestamps.length >= max) {
    const oldest = b.timestamps[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfter };
  }
  b.timestamps.push(now);
  if (buckets.size > 50_000) {
    for (const [k, v] of buckets) {
      v.timestamps = v.timestamps.filter((t) => t > cutoff);
      if (v.timestamps.length === 0) buckets.delete(k);
    }
  }
  return { ok: true };
}
