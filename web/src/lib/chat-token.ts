import { createHmac, timingSafeEqual } from "crypto";

export interface ChatAuthClaims {
  teamSlug: string;
  userId: string;
  userName: string;
  iat: number;
  exp: number;
}

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
  if (!raw) return null;

  try {
    const [payloadBase64, signature] = raw.split(".");
    if (!payloadBase64 || !signature) return null;
    const expectedSignature = signPayload(payloadBase64);
    if (!expectedSignature) return null;

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8")) as ChatAuthClaims;
    if (!parsed?.teamSlug || !parsed?.userId || !parsed?.userName || !parsed?.exp) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const ChatTokenConstants = {
  CHAT_TOKEN_TTL_SECONDS,
};
