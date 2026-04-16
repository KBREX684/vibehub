import { NextResponse } from "next/server";
import { findOrCreateGitHubUser } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { setSessionCookieOnResponse } from "@/lib/auth-session-cookie";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = (await res.json()) as GitHubTokenResponse;
  if (data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || "Token exchange failed");
  }
  return data.access_token;
}

async function fetchGitHubUser(token: string): Promise<GitHubUserResponse> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub API /user failed: ${res.status}`);
  }
  return res.json() as Promise<GitHubUserResponse>;
}

async function fetchPrimaryEmail(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const emails = (await res.json()) as GitHubEmailResponse[];
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? emails.find((e) => e.verified)?.email ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestLogger = getRequestLogger(request, { route: "/api/v1/auth/github/callback" });
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const savedState = parseCookie(cookieHeader, "github_oauth_state");
  const redirectPath = parseCookie(cookieHeader, "github_oauth_redirect") || "/";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth_${error}`, baseUrl));
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", baseUrl));
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const ghUser = await fetchGitHubUser(accessToken);

    let email = ghUser.email;
    if (!email) {
      email = await fetchPrimaryEmail(accessToken);
    }
    if (!email) {
      email = `${ghUser.id}+${ghUser.login}@users.noreply.github.com`;
    }

    const user = await findOrCreateGitHubUser({
      githubId: ghUser.id,
      githubUsername: ghUser.login,
      email,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
    });

    const response = NextResponse.redirect(new URL(redirectPath, baseUrl));
    await setSessionCookieOnResponse(response, request, user);
    response.cookies.delete("github_oauth_state");
    response.cookies.delete("github_oauth_redirect");

    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_SIGNUP_REQUIRED") {
      return NextResponse.redirect(new URL("/signup?error=github_email_signup_required", baseUrl));
    }
    requestLogger.error({ err: serializeError(err) }, "GitHub OAuth callback failed");
    return NextResponse.redirect(new URL("/login?error=oauth_failed", baseUrl));
  }
}

function parseCookie(header: string, name: string): string | undefined {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
