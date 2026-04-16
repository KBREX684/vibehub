import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { resetPasswordWithToken } from "@/lib/repository";

const bodySchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export async function POST(request: Request) {
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = bodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  const ok = await resetPasswordWithToken(zod.data.token, zod.data.newPassword);
  if (!ok) {
    return apiError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "Reset link is invalid or expired" }, 400);
  }
  return apiSuccess({ ok: true });
}
