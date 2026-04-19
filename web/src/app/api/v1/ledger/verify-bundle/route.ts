import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { checkLedgerPublicVerifyRateLimit } from "@/lib/ledger/public-rate-limit";
import { verifyBundle } from "@/lib/repositories/ledger.repository";

const ledgerEntrySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  actorType: z.enum(["user", "agent"]),
  actorId: z.string().min(1),
  actionKind: z.string().min(1),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  payload: z.record(z.any()),
  payloadHash: z.string().min(1),
  prevHash: z.string().optional(),
  signature: z.string().min(1),
  signedAt: z.string().min(1),
  anchorChain: z.enum(["vibehub", "zhixin", "baoquan"]),
  anchorTxId: z.string().optional(),
  anchorVerifiedAt: z.string().optional(),
});

const bundleSchema = z.object({
  signedBy: z.literal("vibehub-signer-v1"),
  publicKey: z.string().min(1),
  entries: z.array(ledgerEntrySchema),
});

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400);
  }

  let parsed: z.infer<typeof bundleSchema>;
  try {
    parsed = bundleSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  const result = await verifyBundle(parsed);
  return apiSuccess(result);
}

