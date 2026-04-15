import { randomBytes } from "crypto";
import type { WebhookEventName } from "@/lib/webhook-events";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { enqueueWebhookDeliver, isWebhookQueueEnabled } from "@/lib/queue/boss";
import { deliverWebhookHttp } from "@/lib/webhook-deliver-http";
import { logger } from "@/lib/logger";
import { assertPublicHttpsUrl } from "@/lib/private-network-url";

/**
 * P3-BE-1: enqueue outbound webhooks (pg-boss when DB + queue enabled), else inline delivery.
 * P3-BE-4: HMAC `X-VibeHub-Signature`, retries + delivery log in `deliverWebhookHttp`.
 * SSRF: only public HTTPS targets (see assertPublicHttpsUrl).
 */
export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEventName,
  payload: Record<string, unknown>
): Promise<void> {
  const bodyObj = { event, userId, payload, ts: new Date().toISOString() };
  const body = JSON.stringify(bodyObj);
  const idem = randomBytes(16).toString("hex");

  const legacy = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  const legacySecret = process.env.NOTIFICATION_WEBHOOK_SECRET?.trim();
  if (legacy) {
    try {
      assertPublicHttpsUrl(legacy);
      const job = {
        userId,
        event,
        body,
        targetUrl: legacy,
        secret: legacySecret,
        idempotencyKey: `${idem}:legacy`,
        webhookEndpointId: null as string | null,
      };
      if (isWebhookQueueEnabled()) {
        void enqueueWebhookDeliver(job).catch((e) => logger.error({ err: e }, "enqueue legacy webhook failed"));
      } else {
        void deliverWebhookHttp(job).catch(() => {});
      }
    } catch {
      /* misconfigured legacy URL — skip */
    }
  }

  if (isMockDataEnabled()) {
    return;
  }

  try {
    const { prisma } = await import("@/lib/db");
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { userId, active: true },
      select: { id: true, url: true, secret: true, events: true },
    });
    for (const ep of endpoints) {
      if (ep.events.length > 0 && !ep.events.includes(event)) continue;
      try {
        assertPublicHttpsUrl(ep.url);
      } catch {
        continue;
      }
      const job = {
        userId,
        event,
        body,
        targetUrl: ep.url,
        secret: ep.secret,
        idempotencyKey: `${idem}:${ep.id}`,
        webhookEndpointId: ep.id,
      };
      if (isWebhookQueueEnabled()) {
        void enqueueWebhookDeliver(job).catch((e) => logger.error({ err: e }, "enqueue user webhook failed"));
      } else {
        void deliverWebhookHttp(job).catch(() => {});
      }
    }
  } catch (e) {
    logger.error({ err: e }, "dispatchWebhookEvent failed");
  }
}

export { verifyWebhookSignature } from "@/lib/webhook-signature";
