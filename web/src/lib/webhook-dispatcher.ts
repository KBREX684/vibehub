import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { WebhookEventName } from "@/lib/webhook-events";
import { isMockDataEnabled } from "@/lib/runtime-mode";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hmacHex(secret: string, body: string): string {
  return createHash("sha256").update(`${secret}:${body}`, "utf8").digest("hex");
}

/**
 * P3-3: Deliver JSON to user-configured endpoints (filtered by `events`), with HMAC + retries.
 * Also posts to `NOTIFICATION_WEBHOOK_URL` when set (legacy single-target; receives all events).
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
    void postWithRetries(legacy, legacySecret, body, idem).catch(() => {});
  }

  if (isMockDataEnabled()) {
    return;
  }

  try {
    const { prisma } = await import("@/lib/db");
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { userId, active: true },
      select: { url: true, secret: true, events: true },
    });
    for (const ep of endpoints) {
      if (ep.events.length > 0 && !ep.events.includes(event)) continue;
      void postWithRetries(ep.url, ep.secret, body, idem).catch(() => {});
    }
  } catch {
    /* never throw */
  }
}

async function postWithRetries(url: string, secret: string | undefined, body: string, idempotencyKey: string): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VibeHub-Webhook/1.0",
    "Idempotency-Key": idempotencyKey,
  };
  if (secret) {
    headers["X-VibeHub-Signature"] = `sha256=${hmacHex(secret, body)}`;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(BASE_DELAY_MS * 2 ** attempt);
  }
  void lastErr;
}

/** Verify `X-VibeHub-Signature: sha256=<hex>` from inbound tests or replays. */
export function verifyWebhookSignature(secret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const got = signatureHeader.slice("sha256=".length);
  const expected = hmacHex(secret, rawBody);
  try {
    const a = Buffer.from(got, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
