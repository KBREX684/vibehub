import { getSessionUserFromCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/response";

export async function GET() {
  const session = await getSessionUserFromCookie();
  return apiSuccess({ session });
}
