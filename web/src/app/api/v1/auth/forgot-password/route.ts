import { z } from "zod";
import { apiSuccess } from "@/lib/response";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { createPasswordResetToken } from "@/lib/repository";
import { sendTransactionalEmail } from "@/lib/mail";

const bodySchema = z.object({ email: z.string().email() }).strict();

/** Always returns 200 to avoid email enumeration. */
export async function POST(request: Request) {
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = bodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  const token = await createPasswordResetToken(zod.data.email);
  if (token) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await sendTransactionalEmail({
      to: zod.data.email,
      subject: "Reset your VibeHub password",
      text: `You requested a password reset.\n\nOpen this link to choose a new password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
  }

  return apiSuccess({ ok: true });
}
