import { NextResponse } from "next/server";

const ALLOW_METHODS = "GET, OPTIONS";
const ALLOW_HEADERS = "Content-Type";

function baseCorsHeaders(allowOrigin: string | null): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (allowOrigin) {
    return { ...base, "Access-Control-Allow-Origin": allowOrigin };
  }
  return base;
}

/**
 * Embed JSON: no wildcard. If `EMBED_CORS_ORIGINS` includes the request Origin,
 * echo that origin and allow credentials; otherwise omit Allow-Origin (same-origin only).
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowlist = (process.env.EMBED_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origin && allowlist.includes(origin)) {
    return {
      ...baseCorsHeaders(origin),
      "Access-Control-Allow-Credentials": "true",
    };
  }
  return baseCorsHeaders(null);
}

export function corsPreflightResponse(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
