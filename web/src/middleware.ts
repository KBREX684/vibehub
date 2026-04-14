import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip-rate-limit";
import { verifySessionCookieSignature } from "@/lib/session-cookie-edge";

// ─── Admin route guard ────────────────────────────────────────────────────────
// The admin layout does a server-side session check; we block at the edge so
// unauthenticated requests never reach the RSC renderer. Session cookie must
// verify with HMAC (same secret as Node auth) — presence alone is not enough.
function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

const WRITE_WINDOW_MS = 60_000;
const DEFAULT_MAX = 30;
function maxWritesPerMinute(): number {
  const raw = process.env.WRITE_RATE_LIMIT_PER_MINUTE?.trim();
  if (!raw) return DEFAULT_MAX;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX;
}

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function checkWriteRateLimitEdge(ip: string, maxPerWindow: number): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = ipBuckets.get(ip);

  if (!existing || existing.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WRITE_WINDOW_MS });
    return { ok: true };
  }

  existing.count++;
  if (existing.count > maxPerWindow) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true };
}

export async function middleware(request: NextRequest) {
  const { method, nextUrl } = request;

  if (isAdminPath(nextUrl.pathname)) {
    const raw = request.cookies.get("vibehub_session")?.value;
    if (!raw || !(await verifySessionCookieSignature(raw))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("required", "admin");
      loginUrl.searchParams.set("redirect", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const isApi = nextUrl.pathname.startsWith("/api/");
  const isWriteMethod = method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

  if (isApi && isWriteMethod) {
    const ip = getClientIp(request);
    const max = maxWritesPerMinute();
    const rl = checkWriteRateLimitEdge(ip, max);
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
