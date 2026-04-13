import { NextResponse } from "next/server";
import { AuthConstants, encodeSession } from "@/lib/auth";
import { getDemoUser } from "@/lib/repository";
import { apiError } from "@/lib/response";

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

function demoLoginAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  // Browser E2E against `next start` runs with NODE_ENV=production; never enable in real prod.
  return process.env.E2E_ALLOW_DEMO_LOGIN === "true";
}

export async function GET(request: Request) {
  if (!demoLoginAllowed()) {
    return apiError(
      { code: "DEMO_LOGIN_DISABLED", message: "Demo login is disabled in production. Use GitHub OAuth." },
      403
    );
  }

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
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
