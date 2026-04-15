import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function corsPreflightResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
