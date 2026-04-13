import { createHmac, randomBytes } from "crypto";
import type { InAppNotificationKind } from "@/lib/types";

function getWebhookUrl(): string | undefined {
  const u = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  return u || undefined;
}

function getWebhookSecret(): string | undefined {
  return process.env.NOTIFICATION_WEBHOOK_SECRET?.trim() || undefined;
}

/** HMAC-SHA256(secret, raw JSON body). Exposed for unit tests. */
export function signNotificationWebhookBody(secret: string, bodyUtf8: string): string {
  return createHmac("sha256", secret).update(bodyUtf8, "utf8").digest("hex");
}

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

/**
 * Outbound push for in-app notification events: optional JSON webhook + optional SMTP to user email.
 * Failures are swallowed (best-effort); in-app row is always persisted by caller first.
 */
export async function dispatchNotificationPush(params: {
  userId: string;
  userEmail: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const webhook = getWebhookUrl();
  if (webhook) {
    try {
      const payload = {
        event: "in_app_notification",
        userId: params.userId,
        userEmail: params.userEmail,
        kind: params.kind,
        title: params.title,
        body: params.body,
        metadata: params.metadata ?? null,
        ts: new Date().toISOString(),
      };
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "VibeHub-Notification/1.0",
      };
      const secret = getWebhookSecret();
      if (secret) {
        const sig = signNotificationWebhookBody(secret, body);
        // GitHub-style prefix: value is HMAC-SHA256(secret, body), not SHA256(secret:body).
        headers["X-VibeHub-Signature"] = `sha256=${sig}`;
        headers["X-VibeHub-Signature-Version"] = "2";
      }
      const idem = randomBytes(16).toString("hex");
      headers["Idempotency-Key"] = idem;
      await fetch(webhook, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
    } catch {
      /* best-effort */
    }
  }

  if (smtpConfigured()) {
    try {
      const nodemailer = await import("nodemailer");
      const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "587", 10);
      const secure = process.env.SMTP_SECURE === "true" || port === 465;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST!.trim(),
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER!.trim(),
          pass: process.env.SMTP_PASS!.trim(),
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM!.trim(),
        to: params.userEmail,
        subject: `[VibeHub] ${params.title}`,
        text: `${params.body}\n\nKind: ${params.kind}`,
      });
    } catch {
      /* best-effort */
    }
  }
}
