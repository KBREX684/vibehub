import { NextResponse } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getOAuthAppAuthorizationCandidate, issueOAuthAuthorizationCode } from "@/lib/repositories/oauth-app.repository";

function redirectWithError(redirectUri: string, error: string, state?: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  const form = await request.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = form.get("state") ? String(form.get("state")) : null;
  const scope = String(form.get("scope") ?? "");
  const codeChallenge = form.get("code_challenge") ? String(form.get("code_challenge")) : "";
  const codeChallengeMethod = form.get("code_challenge_method")
    ? String(form.get("code_challenge_method"))
    : "";
  const decision = String(form.get("decision") ?? "deny");
  if (!redirectUri) {
    return NextResponse.redirect(new URL("/login?error=oauth_invalid_redirect", request.url));
  }
  if (!session) {
    const back = new URL("/login", request.url);
    back.searchParams.set(
      "redirect",
      `/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}${state ? `&state=${encodeURIComponent(state)}` : ""}${codeChallenge ? `&code_challenge=${encodeURIComponent(codeChallenge)}` : ""}${codeChallengeMethod ? `&code_challenge_method=${encodeURIComponent(codeChallengeMethod)}` : ""}`
    );
    return NextResponse.redirect(back);
  }

  try {
    const requestedScopes = scope.split(" ").map((item) => item.trim()).filter(Boolean);
    const app = await getOAuthAppAuthorizationCandidate({
      clientId,
      redirectUri,
      requestedScopes,
    });
    if (!app) return redirectWithError(redirectUri, "invalid_client", state);
    if (decision !== "approve") return redirectWithError(redirectUri, "access_denied", state);
    const code = await issueOAuthAuthorizationCode({
      clientId,
      userId: session.userId,
      redirectUri,
      scopes: requestedScopes,
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod: codeChallengeMethod || undefined,
    });
    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_error";
    return redirectWithError(redirectUri, message.toLowerCase(), state);
  }
}
