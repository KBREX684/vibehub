import { NextResponse } from "next/server";
import { AuthConstants } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ data: { success: true } });
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}
