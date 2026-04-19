import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { checkLedgerPublicVerifyRateLimit } from "@/lib/ledger/public-rate-limit";
import { verifyStoredEntry } from "@/lib/repositories/ledger.repository";

interface Props {
  params: Promise<{ ledgerEntryId: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const rateLimit = await checkLedgerPublicVerifyRateLimit(request);
  if (!rateLimit.ok) {
    return apiError(
      {
        code: "RATE_LIMITED",
        message: "Too many ledger verification requests",
        details: { retryAfterSeconds: rateLimit.retryAfterSeconds },
      },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) }
    );
  }

  try {
    const { ledgerEntryId } = await params;
    const result = await verifyStoredEntry(ledgerEntryId);
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to verify ledger entry";
    return apiError({ code: "LEDGER_VERIFY_FAILED", message }, 500);
  }
}

