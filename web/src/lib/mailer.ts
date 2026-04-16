/**
 * G-01: Magic Link email service.
 *
 * Sends magic-link authentication emails via SMTP (nodemailer).
 * In dev without SMTP config, logs the link to console instead.
 */

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

/**
 * Send a magic link email to the given address.
 * In dev without SMTP, logs to console for development convenience.
 */
export async function sendMagicLinkEmail(params: {
  email: string;
  magicLinkUrl: string;
}): Promise<void> {
  const { email, magicLinkUrl } = params;

  if (!smtpConfigured()) {
    // Dev fallback: log to console
    console.log(`[MagicLink] Login link for ${email}: ${magicLinkUrl}`);
    return;
  }

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
    to: email,
    subject: "[VibeHub] Sign in to your account",
    text: [
      "You requested a sign-in link for VibeHub.",
      "",
      `Click here to sign in: ${magicLinkUrl}`,
      "",
      "This link expires in 15 minutes and can only be used once.",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: [
      "<p>You requested a sign-in link for VibeHub.</p>",
      `<p><a href="${magicLinkUrl}" style="display:inline-block;padding:12px 24px;background:#0071e3;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to VibeHub</a></p>`,
      "<p style='color:#666;font-size:12px;'>This link expires in 15 minutes and can only be used once.</p>",
      "<p style='color:#666;font-size:12px;'>If you did not request this, you can safely ignore this email.</p>",
    ].join("\n"),
  });
}
