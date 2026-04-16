import { z } from "zod";
import { cookies } from "next/headers";
import { AuthConstants, decodeSession } from "@/lib/auth";
import { apiSuccess } from "@/lib/response";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { bumpUserSessionVersion } from "@/lib/session-version";

const logoutBodySchema = z.object({}).strict();

export async function POST(request: Request) {
  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const zod = logoutBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  const cookieStore = await cookies();
  const raw = cookieStore.get(AuthConstants.SESSION_COOKIE_KEY)?.value;
  const session = raw ? decodeSession(raw) : null;
  if (session?.userId) {
    await bumpUserSessionVersion(session.userId);
  }

  const response = apiSuccess({ success: true });
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}
