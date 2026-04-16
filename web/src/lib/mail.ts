import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

export type SendMailResult = { sent: true } | { sent: false; reason: "smtp_not_configured" };

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendMailResult> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    logger.warn({ to: params.to, subject: params.subject }, "SMTP not configured; email not sent");
    return { sent: false, reason: "smtp_not_configured" };
  }

  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!from) {
    logger.error("SMTP_FROM is required when SMTP_HOST is set");
    return { sent: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html ?? params.text.replace(/\n/g, "<br/>"),
  });

  return { sent: true };
}
