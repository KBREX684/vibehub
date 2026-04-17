import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { registerUserWithEmailPassword } from "@/lib/repository";
import { isTransactionalEmailConfigured, sendTransactionalEmail } from "@/lib/mail";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { isProductionLikeEnv } from "@/lib/env-check";
import { enforceAuthActionRateLimit } from "@/lib/auth-rate-limit";

const bodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(80),
    acceptTerms: z.literal(true),
  })
  .strict();

export async function POST(request: Request) {
  const log = getRequestLogger(request, { route: "/api/v1/auth/register" });
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
    action: "register",
    identity: zod.data.email,
  });
  if (!rl.ok) {
    return apiError(
      {
        code: "RATE_LIMITED",
        message: "Too many registration attempts. Please try again later.",
        details: { retryAfterSeconds: rl.retryAfterSeconds },
      },
      429,
      { "Retry-After": String(rl.retryAfterSeconds) }
    );
  }

  try {
    const { userId, verificationToken } = await registerUserWithEmailPassword(zod.data);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    const emailResult = await sendTransactionalEmail({
      to: zod.data.email,
      subject: "Verify your VibeHub account",
      text: `Welcome to VibeHub!\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nIf you did not sign up, you can ignore this message.`,
    });
    if (isProductionLikeEnv() && !emailResult.sent) {
      return apiError(
        { code: "EMAIL_NOT_CONFIGURED", message: "Email delivery is not configured on this server" },
        503
      );
    }

    const devFallback =
      process.env.NODE_ENV === "development" ? { verifyUrl } : {};

    return apiSuccess({
      userId,
      ...devFallback,
      message: "Check your inbox for a verification link.",
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "TERMS_NOT_ACCEPTED") {
        return apiError({ code: "TERMS_REQUIRED", message: "You must accept the terms and privacy policy" }, 400);
      }
      if (e.message === "EMAIL_IN_USE") {
        return apiError({ code: "EMAIL_IN_USE", message: "An account with this email already exists" }, 409);
      }
    }
    log.error({ err: serializeError(e) }, "register failed");
    return apiError({ code: "REGISTER_FAILED", message: "Registration failed" }, 500);
  }
}
