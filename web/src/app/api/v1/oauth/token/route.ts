import { apiError, apiSuccess } from "@/lib/response";
import { exchangeOAuthAuthorizationCode } from "@/lib/repositories/oauth-app.repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

async function parseBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, typeof value === "string" ? value : ""])
    );
  }
  const form = await request.formData();
  return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]));
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (body.grant_type !== "authorization_code") {
      return apiError({ code: "UNSUPPORTED_GRANT_TYPE", message: "Only authorization_code is supported" }, 400);
    }
    const token = await exchangeOAuthAuthorizationCode({
      clientId: body.client_id ?? "",
      clientSecret: body.client_secret ?? "",
      code: body.code ?? "",
      redirectUri: body.redirect_uri ?? "",
    });
    return apiSuccess({
      access_token: token.accessToken,
      token_type: "Bearer",
      expires_in: token.expiresIn,
      scope: token.scopes.join(" "),
    });
  } catch (error) {
    return apiError({ code: "OAUTH_TOKEN_EXCHANGE_FAILED", message: "Failed to exchange OAuth code", details: safeServerErrorDetails(error) }, 400);
  }
}
