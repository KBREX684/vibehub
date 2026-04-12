import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Role, SessionUser } from "@/lib/types";

const SESSION_COOKIE_KEY = "vibehub_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const VALID_ROLES: Role[] = ["guest", "user", "admin"];

interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

function getSessionSecret(): string | null {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-session-secret-change-me";
  }

  return null;
}

function signPayload(payloadBase64: string): string | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function encodeSession(session: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...session,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = signPayload(payloadBase64);

  if (!signature) {
    throw new Error("SESSION_SECRET is required in production");
  }

  return `${payloadBase64}.${signature}`;
}

export function decodeSession(raw?: string): SessionUser | null {
  if (!raw) {
    return null;
  }

  try {
    const [payloadBase64, signature] = raw.split(".");
    if (!payloadBase64 || !signature) {
      return null;
    }

    const expectedSignature = signPayload(payloadBase64);
    if (!expectedSignature) {
      return null;
    }

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed?.userId || !parsed?.role || !parsed?.name || !parsed?.exp) {
      return null;
    }
    if (!VALID_ROLES.includes(parsed.role)) {
      return null;
    }
    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      name: parsed.name,
    };
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
