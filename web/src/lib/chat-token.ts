import { createHmac, timingSafeEqual } from "crypto";

export interface ChatAuthClaims {
  teamSlug: string;
  userId: string;
  userName: string;
  iat: number;
  exp: number;
}

export type ChatTokenErrorCode =
  | "MISSING_TOKEN"
  | "MALFORMED_TOKEN"
  | "INVALID_SIGNATURE"
  | "INVALID_CLAIMS"
  | "TOKEN_EXPIRED";

const CHAT_TOKEN_TTL_SECONDS = parseInt(process.env.CHAT_TOKEN_TTL_SECONDS ?? "120", 10);

function getChatTokenSecret(): string | null {
  const fromEnv = process.env.CHAT_WS_TOKEN_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") return "dev-chat-token-secret-change-me";
  return null;
}

function signPayload(payloadBase64: string): string | null {
  const secret = getChatTokenSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function encodeChatToken(input: {
  teamSlug: string;
  userId: string;
  userName: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ChatAuthClaims = {
    teamSlug: input.teamSlug,
    userId: input.userId,
    userName: input.userName,
    iat: now,
    exp: now + CHAT_TOKEN_TTL_SECONDS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = signPayload(payloadBase64);
  if (!signature) {
    throw new Error("CHAT_WS_TOKEN_SECRET is required in production");
  }
  return `${payloadBase64}.${signature}`;
}

export function decodeChatToken(raw?: string): ChatAuthClaims | null {
  const result = verifyChatToken(raw);
  return result.ok ? result.claims : null;
}

export function verifyChatToken(raw?: string):
  | { ok: true; claims: ChatAuthClaims }
  | { ok: false; code: ChatTokenErrorCode } {
  if (!raw) return { ok: false, code: "MISSING_TOKEN" };

  try {
    const [payloadBase64, signature] = raw.split(".");
    if (!payloadBase64 || !signature) return { ok: false, code: "MALFORMED_TOKEN" };
    const expectedSignature = signPayload(payloadBase64);
    if (!expectedSignature) return { ok: false, code: "INVALID_SIGNATURE" };

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return { ok: false, code: "INVALID_SIGNATURE" };
    }

    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8")) as ChatAuthClaims;
    if (!parsed?.teamSlug || !parsed?.userId || !parsed?.userName || !parsed?.exp) {
      return { ok: false, code: "INVALID_CLAIMS" };
    }
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return { ok: false, code: "TOKEN_EXPIRED" };
    return { ok: true, claims: parsed };
  } catch {
    return { ok: false, code: "MALFORMED_TOKEN" };
  }
}

export const ChatTokenConstants = {
  CHAT_TOKEN_TTL_SECONDS,
};
