import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const isApi = nextUrl.pathname.startsWith("/api/");
  const isWriteMethod = method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

  if (isApi && isWriteMethod) {
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
  matcher: ["/api/:path*"],
};
