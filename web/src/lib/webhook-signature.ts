import { createHmac, timingSafeEqual } from "crypto";

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Verify `X-VibeHub-Signature: sha256=<hex>` from inbound tests or replays. */
export function verifyWebhookSignature(secret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const got = signatureHeader.slice("sha256=".length);
  const expected = signWebhookPayload(secret, rawBody);
  try {
    const a = Buffer.from(got, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
