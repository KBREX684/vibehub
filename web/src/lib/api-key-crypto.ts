import { createHash, randomBytes } from "crypto";

const TOKEN_PREFIX = "vh_";

export function getApiKeyHashPepper(): string {
  const p = process.env.API_KEY_HASH_PEPPER?.trim();
  if (p) {
    return p;
  }
  if (process.env.NODE_ENV !== "production") {
    return "dev-api-key-pepper-change-me";
  }
  throw new Error("API_KEY_HASH_PEPPER is required in production");
}

export function hashApiKeyToken(plaintextToken: string): string {
  return createHash("sha256").update(`${getApiKeyHashPepper()}:${plaintextToken}`, "utf8").digest("hex");
}

/** Returns full secret token (show once) and a short prefix for list UI. */
export function generateApiKeyPlaintext(): { fullToken: string; prefix: string } {
  const secretPart = randomBytes(24).toString("base64url");
  const fullToken = `${TOKEN_PREFIX}${secretPart}`;
  const prefix = `${TOKEN_PREFIX}${secretPart.slice(0, 8)}`;
  return { fullToken, prefix };
}

export function isApiKeyTokenFormat(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length > TOKEN_PREFIX.length + 8;
}
