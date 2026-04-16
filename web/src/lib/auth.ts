import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { checkApiKeyRateLimitAsync } from "@/lib/redis-rate-limit";
import type { ApiKeyScope } from "@/lib/api-key-scopes";
import { allowApiKeyScope } from "@/lib/api-key-scopes";
import { apiError } from "@/lib/response";
import { getSessionUserFromApiKeyToken } from "@/lib/repository";
import { getSessionUserFromOAuthAccessToken } from "@/lib/repositories/oauth-app.repository";
import { resolveSessionSigningSecret } from "@/lib/session-secret-resolver";
import { verifySessionVersionMatches } from "@/lib/session-version";
import type { EnterpriseVerificationStatus, Role, SessionUser, SubscriptionTier } from "@/lib/types";

const SESSION_COOKIE_KEY = "vibehub_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const VALID_ROLES: Role[] = ["guest", "user", "admin"];

interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

function isEnterpriseVerificationStatus(v: unknown): v is EnterpriseVerificationStatus {
  return v === "none" || v === "pending" || v === "approved" || v === "rejected";
}

function isSubscriptionTier(v: unknown): v is SubscriptionTier {
  return v === "free" || v === "pro";
}

function getSessionSecret(): string | null {
  return resolveSessionSigningSecret();
}

function signPayload(payloadBase64: string): string | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function encodeSession(session: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...session,
    sessionVersion: session.sessionVersion ?? 0,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = signPayload(payloadBase64);

  if (!signature) {
    throw new Error("SESSION_SECRET is required (set in production or whenever DATABASE_URL is configured)");
  }

  return `${payloadBase64}.${signature}`;
}

export function decodeSession(raw?: string): SessionUser | null {
  if (!raw) {
    return null;
  }

  try {
    const [payloadBase64, signature] = raw.split(".");
    if (!payloadBase64 || !signature) {
      return null;
    }

    const expectedSignature = signPayload(payloadBase64);
    if (!expectedSignature) {
      return null;
    }

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed?.userId || !parsed?.role || !parsed?.name || !parsed?.exp) {
      return null;
    }
    if (!VALID_ROLES.includes(parsed.role)) {
      return null;
    }
    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    const user: SessionUser = {
      userId: parsed.userId,
      role: parsed.role,
      name: parsed.name,
    };
    if (typeof parsed.sessionVersion === "number" && Number.isFinite(parsed.sessionVersion)) {
      user.sessionVersion = parsed.sessionVersion;
    }
    if (isSubscriptionTier(parsed.subscriptionTier)) {
      user.subscriptionTier = parsed.subscriptionTier;
    }
    if (isEnterpriseVerificationStatus(parsed.enterpriseStatus)) {
      user.enterpriseStatus = parsed.enterpriseStatus;
    }
    if (typeof parsed.enterpriseOrganization === "string" && parsed.enterpriseOrganization) {
      user.enterpriseOrganization = parsed.enterpriseOrganization;
    }
    if (typeof parsed.enterpriseWebsite === "string" && parsed.enterpriseWebsite) {
      user.enterpriseWebsite = parsed.enterpriseWebsite;
    }
    if (Array.isArray(parsed.apiKeyScopes)) {
      user.apiKeyScopes = parsed.apiKeyScopes.filter((s): s is string => typeof s === "string");
    }
    if (typeof parsed.apiKeyId === "string" && parsed.apiKeyId) {
      user.apiKeyId = parsed.apiKeyId;
    }
  if (typeof parsed.agentBindingId === "string" && parsed.agentBindingId) {
    user.agentBindingId = parsed.agentBindingId;
  }
  if (typeof parsed.oauthAppId === "string" && parsed.oauthAppId) {
    user.oauthAppId = parsed.oauthAppId;
  }
  if (typeof parsed.oauthAppClientId === "string" && parsed.oauthAppClientId) {
    user.oauthAppClientId = parsed.oauthAppClientId;
  }
  return user;
  } catch {
    return null;
  }
}

export async function getSessionUserFromCookie(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE_KEY)?.value);
  if (!user) return null;
  const ok = await verifySessionVersionMatches(user);
  return ok ? user : null;
}

/**
 * Derives a CSRF token from the session cookie value so it requires no
 * separate storage. The token is a short HMAC over the raw session string
 * using a "csrf:" prefix to keep the key space separate from session signing.
 *
 * Returns null when no session cookie is present or secret is unavailable.
 */
export function deriveCsrfToken(rawSessionCookie: string): string | null {
  const secret = getSessionSecret();
  if (!secret || !rawSessionCookie) return null;
  return createHmac("sha256", secret)
    .update(`csrf:${rawSessionCookie}`)
    .digest("base64url")
    .slice(0, 32);
}

/**
 * Reads the session cookie and returns the derived CSRF token.
 * For use in server components / route handlers that need to expose the token.
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_KEY)?.value;
  if (!raw) return null;
  const user = decodeSession(raw);
  if (!user || !(await verifySessionVersionMatches(user))) return null;
  return deriveCsrfToken(raw);
}

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return m?.[1]?.trim() || null;
}

export type AuthResult =
  | { kind: "ok"; user: SessionUser }
  | { kind: "unauthorized" }
  | { kind: "rate_limited"; retryAfterSeconds: number };

function rateLimitScopeTierForRequiredScope(
  requiredScope?: ApiKeyScope
): "read_public" | "write" | undefined {
  if (!requiredScope) return undefined;
  if (requiredScope.startsWith("write:")) return "write";
  if (requiredScope === "read:public") return "read_public";
  return undefined;
}

/**
 * After `authenticateRequest`: map to optional user for read routes.
 * - `allowAnonymous`: missing auth yields `user: null` (public read).
 * - Otherwise: missing auth is 401; rate limit is always 429.
 */
export function resolveReadAuth(
  auth: AuthResult,
  allowAnonymous: boolean
):
  | { ok: true; user: SessionUser | null }
  | { ok: false; status: 401 | 429; retryAfterSeconds?: number } {
  if (auth.kind === "rate_limited") {
    return { ok: false, status: 429, retryAfterSeconds: auth.retryAfterSeconds };
  }
  if (auth.kind === "ok") {
    return { ok: true, user: auth.user };
  }
  if (allowAnonymous) {
    return { ok: true, user: null };
  }
  return { ok: false, status: 401 };
}

/**
 * S4: “旁观者”数据面 — 浏览器会话或 API Key（read:public 或 read:enterprise:workspace）可访问
 * 项目雷达、人才雷达、尽调摘要、生态报告等轻量企业数据。
 */
export function allowLightEnterpriseDataRead(user: SessionUser): boolean {
  if (!user.apiKeyScopes?.length) {
    return true;
  }
  return (
    user.apiKeyScopes.includes("read:public") ||
    user.apiKeyScopes.includes("read:enterprise:workspace")
  );
}

/** When `authenticateRequest` returned rate_limited, build the 429 response (with Retry-After). */
export function rateLimitedResponse(retryAfterSeconds: number) {
  return apiError(
    {
      code: "RATE_LIMITED",
      message: "Too many API key requests",
      details: { retryAfterSeconds },
    },
    429,
    { "Retry-After": String(retryAfterSeconds) }
  );
}

/**
 * Cookie session first; else `Authorization: Bearer <api-key>`.
 * When `requiredScope` is set, API key sessions must include that scope (cookie sessions always pass).
 * Bearer path is rate-limited per key hash + client IP (429).
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredScope?: ApiKeyScope
): Promise<AuthResult> {
  const fromRequestCookie = decodeSession(request.cookies.get(SESSION_COOKIE_KEY)?.value);
  if (fromRequestCookie) {
    if (await verifySessionVersionMatches(fromRequestCookie)) {
      return { kind: "ok", user: fromRequestCookie };
    }
  }

  let fromNextCookies: SessionUser | null = null;
  try {
    const cookieStore = await cookies();
    fromNextCookies = decodeSession(cookieStore.get(SESSION_COOKIE_KEY)?.value);
  } catch {
    /* Vitest / non-request context: ignore */
  }
  if (fromNextCookies && (await verifySessionVersionMatches(fromNextCookies))) {
    return { kind: "ok", user: fromNextCookies };
  }

  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { kind: "unauthorized" };
  }

  const rl = await checkApiKeyRateLimitAsync(
    token,
    request,
    rateLimitScopeTierForRequiredScope(requiredScope)
  );
  if (!rl.ok) {
    return { kind: "rate_limited", retryAfterSeconds: rl.retryAfter };
  }

  try {
    const user =
      (await getSessionUserFromApiKeyToken(token)) ??
      (await getSessionUserFromOAuthAccessToken(token));
    if (!user) {
      return { kind: "unauthorized" };
    }
    if (requiredScope && !allowApiKeyScope(user, requiredScope)) {
      return { kind: "unauthorized" };
    }
    return { kind: "ok", user };
  } catch {
    return { kind: "unauthorized" };
  }
}

/** Same as `authenticateRequest` without a scope gate (caller enforces scopes itself if needed). */
export async function getSessionUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const r = await authenticateRequest(request);
  return r.kind === "ok" ? r.user : null;
}

export const AuthConstants = {
  SESSION_COOKIE_KEY,
};
