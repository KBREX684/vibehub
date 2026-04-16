import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/repository";
import { apiError } from "@/lib/response";
import { sanitizeSameOriginRedirectPath } from "@/lib/redirect-safety";
import { setSessionCookieOnResponse } from "@/lib/auth-session-cookie";

function parseDemoRole(value: string | null): "admin" | "user" {
  return value === "admin" ? "admin" : "user";
}

export async function GET(request: Request) {
  // Demo login is development-only (staging/production must use real auth).
  if (process.env.NODE_ENV !== "development" || process.env.DISABLE_DEMO_LOGIN === "true") {
    return apiError({ code: "NOT_FOUND", message: "Not found" }, 404);
  }

  const url = new URL(request.url);
  const role = parseDemoRole(url.searchParams.get("role"));
  const redirect = sanitizeSameOriginRedirectPath(url.searchParams.get("redirect"));
  const session = getDemoUser(role);

  const response = NextResponse.redirect(new URL(redirect, request.url));
  await setSessionCookieOnResponse(response, request, {
    userId: session.userId,
    name: session.name,
    role: session.role,
    sessionVersion: session.sessionVersion,
    enterpriseStatus: session.enterpriseStatus,
    enterpriseOrganization: session.enterpriseOrganization,
    enterpriseWebsite: session.enterpriseWebsite,
  });

  return response;
}
