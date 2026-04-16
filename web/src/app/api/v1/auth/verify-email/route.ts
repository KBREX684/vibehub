import { NextResponse } from "next/server";
import { verifyEmailSignupToken } from "@/lib/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin;

  const result = await verifyEmailSignupToken(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/login?error=verify_failed", base));
  }
  return NextResponse.redirect(new URL("/login?verified=1", base));
}
