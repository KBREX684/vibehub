import { z } from "zod";
import { apiSuccess } from "@/lib/response";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { createPasswordResetToken } from "@/lib/repository";
import { apiError } from "@/lib/response";
import { isTransactionalEmailConfigured, sendTransactionalEmail } from "@/lib/mail";
import { isProductionLikeEnv } from "@/lib/env-check";
import { enforceAuthActionRateLimit } from "@/lib/auth-rate-limit";

const bodySchema = z.object({ email: z.string().email() }).strict();

/** Always returns 200 to avoid email enumeration. */
export async function POST(request: Request) {
  if (isProductionLikeEnv() && !isTransactionalEmailConfigured()) {
    return apiError(
      { code: "EMAIL_NOT_CONFIGURED", message: "Email delivery is not configured on this server" },
      503
    );
  }
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = bodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);
  const rl = await enforceAuthActionRateLimit({
    request,
    action: "forgot_password",
    identity: zod.data.email,
  });
  if (!rl.ok) {
    return apiError(
      {
        code: "RATE_LIMITED",
        message: "Too many password reset attempts. Please try again later.",
        details: { retryAfterSeconds: rl.retryAfterSeconds },
      },
      429,
      { "Retry-After": String(rl.retryAfterSeconds) }
    );
  }

  const token = await createPasswordResetToken(zod.data.email);
  if (token) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await sendTransactionalEmail({
      to: zod.data.email,
      subject: "Reset your VibeHub password",
      text: `You requested a password reset.\n\nOpen this link to choose a new password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
    if (process.env.NODE_ENV === "development") {
      return apiSuccess({ ok: true, resetUrl });
    }
  }

  return apiSuccess({ ok: true });
}
