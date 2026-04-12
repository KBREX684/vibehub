import { NextResponse } from "next/server";
import { AuthConstants, encodeSession } from "@/lib/auth";
import { getDemoUser } from "@/lib/repository";

function parseDemoRole(value: string | null): "admin" | "user" {
  return value === "admin" ? "admin" : "user";
}

function sanitizeRedirectPath(value: string | null): string {
  if (!value) {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = parseDemoRole(url.searchParams.get("role"));
  const redirect = sanitizeRedirectPath(url.searchParams.get("redirect"));
  const session = getDemoUser(role);
  const token = encodeSession(session);

  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
