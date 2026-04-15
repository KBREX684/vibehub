import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Admin route guard ────────────────────────────────────────────────────────
// The admin layout does a server-side session check, but we also block at
// the edge so un-authenticated requests never reach the RSC renderer.
// We cannot decode the JWT here (crypto not available in Edge), so we simply
// redirect to /login if the session cookie is absent.
function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get("vibehub_session")?.value);
}

// ─── CSRF protection ─────────────────────────────────────────────────────────
// Routes exempt from CSRF checks: the CSRF token endpoint itself, auth
// callbacks (server-to-server redirects), Stripe webhook (verified by
// HMAC signature), and the public embed endpoint (API-key only).
const CSRF_EXEMPT_PREFIXES = [
  "/api/v1/auth/csrf-token",
  "/api/v1/auth/github",
  "/api/v1/billing/webhook",
  "/api/v1/embed/",
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Derives the expected CSRF token from the raw session cookie value using
 * Web Crypto (available in Edge Runtime), mirroring the Node.js HMAC in
 * auth.ts so the edge can verify without importing crypto.
 */
async function deriveEdgeCsrfToken(rawSession: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`csrf:${rawSession}`));
  // base64url-encode then take first 32 chars — same as auth.ts deriveCsrfToken
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64.slice(0, 32);
}

// ─── Write rate limit ─────────────────────────────────────────────────────────
const WRITE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_MINUTE = 30;

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkWriteRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = ipBuckets.get(ip);

  if (!existing || existing.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WRITE_WINDOW_MS });
    return { ok: true };
  }

  existing.count++;
  if (existing.count > MAX_WRITES_PER_MINUTE) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true };
}

export async function middleware(request: NextRequest) {
  const { method, nextUrl } = request;

  // Admin page protection — redirect unauthenticated to /login
  if (isAdminPath(nextUrl.pathname) && !hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("required", "admin");
    loginUrl.searchParams.set("redirect", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isApi = nextUrl.pathname.startsWith("/api/");
  const isWriteMethod =
    method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

  if (isApi && isWriteMethod) {
    // ── CSRF double-submit check ──────────────────────────────────────────
    // Only applies when the request is authenticated via session cookie.
    // Bearer API-key requests are exempt (they don't use cookies at all).
    const rawSession = request.cookies.get("vibehub_session")?.value;
    if (rawSession && !isCsrfExempt(nextUrl.pathname)) {
      const submittedToken = request.headers.get("x-csrf-token");
      const secret = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";

      let valid = false;
      if (submittedToken) {
        const expected = await deriveEdgeCsrfToken(rawSession, secret);
        valid = submittedToken === expected;
      }

      if (!valid) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "CSRF token missing or invalid",
            },
          },
          { status: 403 }
        );
      }
    }

    // ── Write rate limit ──────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = checkWriteRateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many write requests. Please try again later.",
            details: { retryAfterSeconds: rl.retryAfterSeconds },
          },
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/admin"],
};
