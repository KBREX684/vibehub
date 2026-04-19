import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getWorkShellBadges, listWorkspaceSummariesForUser } from "@/lib/work-console";

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const [items, badges] = await Promise.all([
    listWorkspaceSummariesForUser(session.userId),
    getWorkShellBadges(session.userId),
  ]);

  return apiSuccess({ items, badges });
}
