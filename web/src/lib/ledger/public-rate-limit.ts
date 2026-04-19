import type { NextRequest } from "next/server";
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { getClientIp } from "@/lib/ip-rate-limit";

export async function checkLedgerPublicVerifyRateLimit(request: NextRequest) {
  const maxRequestsRaw = process.env.LEDGER_VERIFY_RATE_LIMIT_PER_MINUTE?.trim();
  const maxRequests = maxRequestsRaw ? Number.parseInt(maxRequestsRaw, 10) : 120;
  return checkDistributedRateLimit({
    bucketKey: `ledger-verify:${getClientIp(request)}`,
    maxRequests: Number.isFinite(maxRequests) && maxRequests > 0 ? maxRequests : 120,
  });
}

