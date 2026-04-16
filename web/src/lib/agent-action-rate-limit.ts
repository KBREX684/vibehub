const WINDOW_MS = 60_000;

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

function maxPerWindow(): number {
  const raw = process.env.AGENT_ACTION_MAX_PER_MINUTE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 20;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function bucketKey(agentBindingId: string, action: string): string {
  return `${agentBindingId}::${action}`;
}

export function checkAgentActionRateLimit(
  agentBindingId: string,
  action: string
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const key = bucketKey(agentBindingId, action);
  const max = maxPerWindow();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  const cutoff = now - WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((value) => value > cutoff);
  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfter };
  }
  bucket.timestamps.push(now);
  if (buckets.size > 50_000) {
    for (const [bucketKeyValue, value] of buckets) {
      value.timestamps = value.timestamps.filter((entry) => entry > cutoff);
      if (value.timestamps.length === 0) buckets.delete(bucketKeyValue);
    }
  }
  return { ok: true };
}
