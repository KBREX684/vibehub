import { AuthConstants } from "@/lib/auth";
import { apiSuccess } from "@/lib/response";

export async function POST() {
  const response = apiSuccess({ success: true });
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}
