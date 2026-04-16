import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip-rate-limit";
import { decodeSessionEdge } from "@/lib/session-edge";
import { resolveSessionSigningSecret } from "@/lib/session-secret-resolver";

// ─── Admin route guard ────────────────────────────────────────────────────────
// Decode HMAC session at the edge (Web Crypto) and require role === "admin".
// Non-admins are redirected to home so they never receive the admin layout shell.
function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isLoginProtectedPage(pathname: string): boolean {
  return pathname === "/notifications" || pathname.startsWith("/notifications/");
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
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64.slice(0, 32);
}

// ─── API rate limit ───────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_MAX_WRITES_PER_MINUTE = 30;
const DEFAULT_MAX_GETS_PER_MINUTE = 300;
const DEFAULT_MAX_SEARCH_GETS_PER_MINUTE = 60;

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function maxWritesPerMinute(): number {
  const raw = process.env.WRITE_RATE_LIMIT_PER_MINUTE?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_WRITES_PER_MINUTE;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_WRITES_PER_MINUTE;
}

function maxGetsPerMinute(): number {
  const raw = process.env.GET_RATE_LIMIT_PER_MINUTE?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_GETS_PER_MINUTE;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_GETS_PER_MINUTE;
}

function maxSearchGetsPerMinute(): number {
  const raw = process.env.SEARCH_RATE_LIMIT_PER_MINUTE?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_SEARCH_GETS_PER_MINUTE;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SEARCH_GETS_PER_MINUTE;
}

function checkIpRateLimit(
  bucketKey: string,
  maxRequestsPerMinute: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = ipBuckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    ipBuckets.set(bucketKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }

  existing.count++;
  if (existing.count > maxRequestsPerMinute) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true };
}

export async function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  function withRequestId(response: NextResponse) {
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Admin page protection — valid session + admin role required
  if (isAdminPath(nextUrl.pathname)) {
    const raw = request.cookies.get("vibehub_session")?.value;
    const session = raw ? await decodeSessionEdge(raw) : null;
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("required", "admin");
      loginUrl.searchParams.set("redirect", nextUrl.pathname);
      return withRequestId(NextResponse.redirect(loginUrl));
    }
    if (session.role !== "admin") {
      return withRequestId(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  if (isLoginProtectedPage(nextUrl.pathname)) {
    const raw = request.cookies.get("vibehub_session")?.value;
    const session = raw ? await decodeSessionEdge(raw) : null;
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", nextUrl.pathname);
      return withRequestId(NextResponse.redirect(loginUrl));
    }
  }

  const isApi = nextUrl.pathname.startsWith("/api/");
  const isReadMethod = method === "GET";
  const isWriteMethod =
    method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

  if (isApi && (isWriteMethod || isReadMethod)) {
    const ip = getClientIp(request);

    // ── Read rate limit ───────────────────────────────────────────────────
    if (isReadMethod) {
      const isSearchPath = nextUrl.pathname.startsWith("/api/v1/search");
      const readMax = isSearchPath ? maxSearchGetsPerMinute() : maxGetsPerMinute();
      const readBucketKey = `${ip}:read:${isSearchPath ? "search" : "default"}`;
      const rlRead = checkIpRateLimit(readBucketKey, readMax);
      if (!rlRead.ok) {
        return withRequestId(
          NextResponse.json(
            {
              error: {
                code: "RATE_LIMITED",
                message: "Too many read requests. Please try again later.",
                details: { retryAfterSeconds: rlRead.retryAfterSeconds },
              },
            },
            { status: 429, headers: { "Retry-After": String(rlRead.retryAfterSeconds) } }
          )
        );
      }
    }

    if (!isWriteMethod) {
      return withRequestId(
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      );
    }

    // Stripe webhook relies on signed payload verification and should not be
    // blocked by IP write rate limiting.
    const isWebhookPath = nextUrl.pathname.startsWith("/api/v1/billing/webhook");
    if (isWebhookPath) {
      return withRequestId(
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      );
    }

    // ── CSRF double-submit check ──────────────────────────────────────────
    // Only applies when the request is authenticated via session cookie.
    // Bearer API-key requests are exempt (they don't use cookies at all).
    const rawSession = request.cookies.get("vibehub_session")?.value;
    if (rawSession && !isCsrfExempt(nextUrl.pathname)) {
      const submittedToken = request.headers.get("x-csrf-token");
      const secret = resolveSessionSigningSecret() ?? "dev-session-secret-change-me";

      let valid = false;
      if (submittedToken) {
        const expected = await deriveEdgeCsrfToken(rawSession, secret);
        valid = submittedToken === expected;
      }

      if (!valid) {
        return withRequestId(
          NextResponse.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "CSRF token missing or invalid",
              },
            },
            { status: 403 }
          )
        );
      }
    }

    // ── Write rate limit ──────────────────────────────────────────────────
    const rl = checkIpRateLimit(`${ip}:write`, maxWritesPerMinute());
    if (!rl.ok) {
      return withRequestId(
        NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many write requests. Please try again later.",
              details: { retryAfterSeconds: rl.retryAfterSeconds },
            },
          },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
        )
      );
    }
  }

  return withRequestId(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  );
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/admin", "/notifications", "/notifications/:path*"],
};
