/**
 * P2-2 / W8: per-user per-tool window for MCP v2 invoke.
 * Redis-backed when configured; development can fall back to in-memory.
 */

import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit";

function maxPerWindow(): number {
  const raw = process.env.MCP_USER_TOOL_MAX_PER_MINUTE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function bucketKey(userId: string, tool: string): string {
  return `${userId}::${tool}`;
}

export async function checkMcpUserToolRateLimit(
  userId: string,
  tool: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const result = await checkDistributedRateLimit({
    bucketKey: `mcp-user-tool:${bucketKey(userId, tool)}`,
    maxRequests: maxPerWindow(),
  });
  if (!result.ok) {
    return { ok: false, retryAfter: result.retryAfterSeconds };
  }
  return { ok: true };
}
