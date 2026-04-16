import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { authenticateEmailPassword } from "@/lib/repository";
import { setSessionCookieOnResponse } from "@/lib/auth-session-cookie";
import { getRequestLogger, serializeError } from "@/lib/logger";

const bodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(request: Request) {
  const log = getRequestLogger(request, { route: "/api/v1/auth/login" });
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = bodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  try {
    const user = await authenticateEmailPassword(zod.data.email, zod.data.password);
    if (!user) {
      return apiError({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" }, 401);
    }
    const res = apiSuccess({ ok: true });
    await setSessionCookieOnResponse(res, request, user);
    return res;
  } catch (e) {
    log.error({ err: serializeError(e) }, "login failed");
    return apiError({ code: "LOGIN_FAILED", message: "Login failed" }, 500);
  }
}
