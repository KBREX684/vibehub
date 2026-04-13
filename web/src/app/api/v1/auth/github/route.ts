import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function getGitHubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return { clientId, baseUrl };
}

export async function GET(request: Request) {
  const { clientId, baseUrl } = getGitHubOAuthConfig();

  if (!clientId) {
    return NextResponse.json(
      { error: { code: "OAUTH_NOT_CONFIGURED", message: "GitHub OAuth is not configured" } },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") || "/";
  const state = randomBytes(16).toString("hex");

  const callbackUrl = `${baseUrl}/api/v1/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "read:user user:email",
    state,
  });

  const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  const response = NextResponse.redirect(githubUrl);
  response.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });
  response.cookies.set("github_oauth_redirect", redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });

  return response;
}
