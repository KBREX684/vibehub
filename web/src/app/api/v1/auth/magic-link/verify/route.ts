/**
 * G-01: GET /api/v1/auth/magic-link/verify?token=xxx
 *
 * Verifies a magic link token and creates a session.
 * - Token must be valid SHA-256 hash, not expired, not used.
 * - Creates a new user if email not found (registration via magic link).
 * - Marks token as used after verification.
 */
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { AuthConstants, encodeSession } from "@/lib/auth";
import { getUserTier } from "@/lib/repository";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { writeAuditLog } from "@/lib/audit";
import { getRequestLogger, serializeError } from "@/lib/logger";

export async function GET(request: Request) {
  const log = getRequestLogger(request, { route: "GET /api/v1/auth/magic-link/verify" });
  const url = new URL(request.url);
  const rawToken = url.searchParams.get("token");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!rawToken || rawToken.length !== 64 || !/^[0-9a-f]+$/.test(rawToken)) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", baseUrl));
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  try {
    if (isMockDataEnabled()) {
      // In mock mode, redirect to login with mock session
      return NextResponse.redirect(new URL("/login?error=mock_mode_no_verify", baseUrl));
    }

    const { prisma } = await import("@/lib/db");

    // Find and validate token
    const magicToken = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });

    if (!magicToken) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", baseUrl));
    }

    if (magicToken.usedAt) {
      return NextResponse.redirect(new URL("/login?error=token_used", baseUrl));
    }

    if (magicToken.expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/login?error=token_expired", baseUrl));
    }

    // Mark token as used immediately to prevent replay
    await prisma.magicLinkToken.update({
      where: { id: magicToken.id },
      data: { usedAt: new Date() },
    });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: magicToken.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sessionVersion: true,
        enterpriseProfile: {
          select: {
            status: true,
            organization: true,
            website: true,
          },
        },
      },
    });

    if (!user) {
      // Register new user via magic link
      const namePart = magicToken.email.split("@")[0] || "user";
      user = await prisma.user.create({
        data: {
          email: magicToken.email,
          name: namePart,
          role: "user",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          sessionVersion: true,
          enterpriseProfile: {
            select: {
              status: true,
              organization: true,
              website: true,
            },
          },
        },
      });
    }

    const subscriptionTier = await getUserTier(user.id);
    const ep = user.enterpriseProfile;

    const session = encodeSession({
      userId: user.id,
      role: user.role as "guest" | "user" | "admin",
      name: user.name,
      sessionVersion: user.sessionVersion ?? 0,
      enterpriseStatus: (ep?.status as "none" | "pending" | "approved" | "rejected") ?? "none",
      enterpriseOrganization: ep?.organization ?? undefined,
      enterpriseWebsite: ep?.website ?? undefined,
      subscriptionTier,
    });

    const response = NextResponse.redirect(new URL("/", baseUrl));
    response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, session, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    // G-06: audit log for magic link login
    void writeAuditLog({
      actorId: user.id,
      action: "session.login_magic_link",
      entityType: "session",
      entityId: user.id,
      metadata: { method: "magic_link", email: magicToken.email },
    });

    return response;
  } catch (err) {
    log.error({ err: serializeError(err) }, "Magic link verification failed");
    return NextResponse.redirect(new URL("/login?error=callback_error", baseUrl));
  }
}
