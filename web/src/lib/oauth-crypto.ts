import { randomBytes } from "crypto";
import { hashApiKeyToken } from "@/lib/api-key-crypto";

const OAUTH_ACCESS_TOKEN_PREFIX = "vho_";
const OAUTH_CLIENT_SECRET_PREFIX = "vhs_";
const OAUTH_CLIENT_ID_PREFIX = "vhoapp_";

export function generateOAuthClientCredentials(): {
  clientId: string;
  clientSecret: string;
  clientSecretHash: string;
} {
  const clientId = `${OAUTH_CLIENT_ID_PREFIX}${randomBytes(12).toString("base64url")}`;
  const clientSecret = `${OAUTH_CLIENT_SECRET_PREFIX}${randomBytes(24).toString("base64url")}`;
  return {
    clientId,
    clientSecret,
    clientSecretHash: hashApiKeyToken(clientSecret),
  };
}

export function generateOAuthAuthorizationCode(): { code: string; codeHash: string } {
  const code = randomBytes(24).toString("base64url");
  return { code, codeHash: hashApiKeyToken(code) };
}

export function generateOAuthAccessToken(): {
  token: string;
  prefix: string;
  tokenHash: string;
} {
  const secret = randomBytes(24).toString("base64url");
  const token = `${OAUTH_ACCESS_TOKEN_PREFIX}${secret}`;
  const prefix = `${OAUTH_ACCESS_TOKEN_PREFIX}${secret.slice(0, 8)}`;
  return { token, prefix, tokenHash: hashApiKeyToken(token) };
}

export function hashOAuthOpaqueToken(token: string): string {
  return hashApiKeyToken(token);
}

export function isOAuthAccessTokenFormat(token: string): boolean {
  return token.startsWith(OAUTH_ACCESS_TOKEN_PREFIX) && token.length > OAUTH_ACCESS_TOKEN_PREFIX.length + 8;
}
