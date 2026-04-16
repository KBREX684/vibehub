/**
 * G-01: POST /api/v1/auth/magic-link
 *
 * Accepts an email address, generates a magic link token, and sends it via email.
 * Rate limited: 5 requests per email per hour.
 *
 * Security: Always returns success to avoid email enumeration.
 */
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { apiError, apiSuccess } from "@/lib/response";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { sendMagicLinkEmail } from "@/lib/mailer";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

const bodySchema = z.object({
  email: z.string().email().max(320),
});

// Simple in-memory rate limit for magic link requests (per email, 5/hour)
const emailRateMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

function checkEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const timestamps = (emailRateMap.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    emailRateMap.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  emailRateMap.set(key, timestamps);
  return true;
}

export async function POST(request: Request) {
  const log = getRequestLogger(request, { route: "POST /api/v1/auth/magic-link" });

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = bodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  const { email } = zod.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit check
  if (!checkEmailRateLimit(normalizedEmail)) {
    return apiError(
      { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
      429,
      { "Retry-After": "3600" }
    );
  }

  try {
    // Generate token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    if (isMockDataEnabled()) {
      // In mock mode, just log the link
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const verifyUrl = `${baseUrl}/api/v1/auth/magic-link/verify?token=${rawToken}`;
      console.log(`[MagicLink-Mock] Token for ${normalizedEmail}: ${rawToken}`);
      console.log(`[MagicLink-Mock] Verify URL: ${verifyUrl}`);
    } else {
      const { prisma } = await import("@/lib/db");

      // Optionally link to existing user
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      await prisma.magicLinkToken.create({
        data: {
          email: normalizedEmail,
          tokenHash,
          userId: existingUser?.id ?? null,
          expiresAt,
        },
      });

      // Send email
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const verifyUrl = `${baseUrl}/api/v1/auth/magic-link/verify?token=${rawToken}`;
      await sendMagicLinkEmail({ email: normalizedEmail, magicLinkUrl: verifyUrl });
    }
  } catch (err) {
    // Best-effort: log error but always return generic success
    log.error({ err: serializeError(err) }, "Magic link send failed");
  }

  // Always return success to prevent email enumeration
  return apiSuccess({
    message: "If this email is registered, you will receive a sign-in link.",
  });
}
