import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit";

function maxPerWindow(): number {
  const raw = process.env.AGENT_ACTION_MAX_PER_MINUTE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 20;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function bucketKey(agentBindingId: string, action: string): string {
  return `${agentBindingId}::${action}`;
}

export async function checkAgentActionRateLimit(
  agentBindingId: string,
  action: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const result = await checkDistributedRateLimit({
    bucketKey: `agent-action:${bucketKey(agentBindingId, action)}`,
    maxRequests: maxPerWindow(),
  });
  if (!result.ok) {
    return { ok: false, retryAfter: result.retryAfterSeconds };
  }
  return { ok: true };
}
