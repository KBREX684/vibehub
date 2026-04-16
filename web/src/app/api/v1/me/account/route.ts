import { apiError, apiSuccess } from "@/lib/response";
import { authenticateRequest } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/repository";
import { AuthConstants } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  await deleteUserAccount(auth.user.userId);

  const res = apiSuccess({ ok: true });
  res.cookies.set(AuthConstants.SESSION_COOKIE_KEY, "", {
    maxAge: 0,
    path: "/",
  });
  return res;
}
