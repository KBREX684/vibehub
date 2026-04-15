import type { SessionUser } from "@/lib/types";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError } from "@/lib/response";

export async function requireAdminSession() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return {
      ok: false as const,
      response: apiError(
        {
          code: "UNAUTHORIZED",
          message: "Login required",
        },
        401
      ),
    };
  }

  if (session.role !== "admin") {
    return {
      ok: false as const,
      response: apiError(
        {
          code: "FORBIDDEN",
          message: "Admin role required",
        },
        403
      ),
    };
  }

  return { ok: true as const, session };
}

export async function getAdminSessionForPage(): Promise<SessionUser | null> {
  const session = await getSessionUserFromCookie();
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}
