import { z } from "zod";
import { AuthConstants, getSessionUserFromCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/response";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { writeAuditLog } from "@/lib/audit";

const logoutBodySchema = z.object({}).strict();

export async function POST(request: Request) {
  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const zod = logoutBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  // G-06: audit log for logout (best-effort, before clearing cookie)
  const session = await getSessionUserFromCookie();
  if (session) {
    void writeAuditLog({
      actorId: session.userId,
      action: "session.logout",
      entityType: "session",
      entityId: session.userId,
    });
  }

  const response = apiSuccess({ success: true });
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}
