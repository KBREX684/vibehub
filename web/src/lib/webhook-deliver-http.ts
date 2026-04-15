import { createHash } from "crypto";
import type { WebhookDeliverJob } from "@/lib/webhook-job-types";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { logger } from "@/lib/logger";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hmacHex(secret: string, body: string): string {
  return createHash("sha256").update(`${secret}:${body}`, "utf8").digest("hex");
}

/**
 * P3-BE-1: HTTP POST with retries + P3-BE-4: persist delivery outcome.
 */
export async function deliverWebhookHttp(job: WebhookDeliverJob): Promise<{
  ok: boolean;
  httpStatus?: number;
  error?: string;
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VibeHub-Webhook/1.0",
    "Idempotency-Key": job.idempotencyKey,
  };
  if (job.secret) {
    headers["X-VibeHub-Signature"] = `sha256=${hmacHex(job.secret, job.body)}`;
  }

  let lastHttp: number | undefined;
  let lastErr: string | undefined;
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    attempts = attempt + 1;
    try {
      const res = await fetch(job.targetUrl, {
        method: "POST",
        headers,
        body: job.body,
        signal: AbortSignal.timeout(10_000),
      });
      lastHttp = res.status;
      if (res.ok) {
        await logDelivery(job, "success", attempts, res.status, undefined);
        return { ok: true, httpStatus: res.status };
      }
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await sleep(BASE_DELAY_MS * 2 ** attempt);
  }

  logger.warn(
    { userId: job.userId, event: job.event, url: job.targetUrl, attempts, lastHttp, lastErr },
    "webhook delivery failed after retries"
  );
  await logDelivery(job, "failed", attempts, lastHttp, lastErr);
  return { ok: false, httpStatus: lastHttp, error: lastErr };
}

async function logDelivery(
  job: WebhookDeliverJob,
  status: "success" | "failed",
  attempts: number,
  httpStatus: number | undefined,
  errorMessage: string | undefined
): Promise<void> {
  if (isMockDataEnabled()) return;
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.webhookDelivery.create({
      data: {
        userId: job.userId,
        webhookEndpointId: job.webhookEndpointId ?? null,
        event: job.event,
        targetUrl: job.targetUrl,
        status,
        httpStatus: httpStatus ?? null,
        errorMessage: errorMessage?.slice(0, 2000) ?? null,
        attempts,
        idempotencyKey: job.idempotencyKey,
      },
    });
  } catch (e) {
    logger.error({ err: e }, "webhook delivery log failed");
  }
}
