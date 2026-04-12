import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/types";

const SESSION_COOKIE_KEY = "vibehub_session";

export function encodeSession(session: SessionUser): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

export function decodeSession(raw?: string): SessionUser | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
    if (!parsed?.userId || !parsed?.role || !parsed?.name) {
      return null;
    }
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUserFromCookie(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_KEY)?.value);
}

export const AuthConstants = {
  SESSION_COOKIE_KEY,
};
