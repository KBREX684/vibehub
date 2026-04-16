import type { NextResponse } from "next/server";
import { AuthConstants, encodeSession } from "@/lib/auth";
import type { Role, SessionUser } from "@/lib/types";
import { getUserTier } from "@/lib/repository";

export function sessionCookieOptions(request: Request): {
  httpOnly: boolean;
  path: string;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
} {
  const urlObj = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secureCookie = urlObj.protocol === "https:" || forwardedProto === "https";
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 60 * 60 * 24 * 7,
  };
}

type SessionCookieUser = {
  id?: string;
  userId?: string;
  name: string;
  role: Role;
  sessionVersion?: number;
  enterpriseStatus?: SessionUser["enterpriseStatus"];
  enterpriseOrganization?: string;
  enterpriseWebsite?: string;
};

/** Build a full session and set the cookie on the response. */
export async function setSessionCookieOnResponse(
  response: NextResponse,
  request: Request,
  user: SessionCookieUser
): Promise<void> {
  const uid = user.id ?? user.userId;
  if (!uid) {
    throw new Error("setSessionCookieOnResponse: missing user id");
  }
  const subscriptionTier = await getUserTier(uid);
  const session: SessionUser = {
    userId: uid,
    role: user.role,
    name: user.name,
    sessionVersion: user.sessionVersion ?? 0,
    enterpriseStatus: user.enterpriseStatus ?? "none",
    enterpriseOrganization: user.enterpriseOrganization,
    enterpriseWebsite: user.enterpriseWebsite,
    subscriptionTier,
  };
  const token = encodeSession(session);
  const opts = sessionCookieOptions(request);
  response.cookies.set(AuthConstants.SESSION_COOKIE_KEY, token, opts);
}
