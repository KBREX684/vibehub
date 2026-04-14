import { NextResponse } from "next/server";
import { AuthConstants, encodeSession } from "@/lib/auth";
import { getDemoUser } from "@/lib/repository";
import { apiError } from "@/lib/response";
import { sanitizeSameOriginRedirectPath } from "@/lib/redirect-safety";

function parseDemoRole(value: string | null): "admin" | "user" {
  return value === "admin" ? "admin" : "user";
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.DISABLE_DEMO_LOGIN === "true") {
    return apiError({ code: "NOT_FOUND", message: "Not found" }, 404);
  }

  const url = new URL(request.url);
  const role = parseDemoRole(url.searchParams.get("role"));
  const redirect = sanitizeSameOriginRedirectPath(url.searchParams.get("redirect"));
  const session = getDemoUser(role);
  const token = encodeSession(session);

  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
