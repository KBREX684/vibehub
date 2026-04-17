import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { isProductionLikeEnv } from "@/lib/env-check";

const ENCRYPTION_PREFIX = "enc:v1:";

function resolveDataEncryptionSecret(): string {
  const direct = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (direct) return direct;
  if (!isProductionLikeEnv()) {
    return process.env.SESSION_SECRET?.trim() || "dev-data-encryption-key-change-me";
  }
  throw new Error("DATA_ENCRYPTION_KEY_REQUIRED");
}

function deriveKey(): Buffer {
  return createHash("sha256").update(resolveDataEncryptionSecret(), "utf8").digest();
}

function aadBuffer(purpose?: string): Buffer | undefined {
  return purpose?.trim() ? Buffer.from(purpose.trim(), "utf8") : undefined;
}

export function isEncryptedSecret(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptStoredSecret(plaintext: string, purpose?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const aad = aadBuffer(purpose);
  if (aad) {
    cipher.setAAD(aad);
  }
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function decryptStoredSecret(ciphertextOrPlaintext: string, purpose?: string): string {
  if (!isEncryptedSecret(ciphertextOrPlaintext)) {
    return ciphertextOrPlaintext;
  }
  const payload = ciphertextOrPlaintext.slice(ENCRYPTION_PREFIX.length);
  const raw = Buffer.from(payload, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
  const aad = aadBuffer(purpose);
  if (aad) {
    decipher.setAAD(aad);
  }
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskSecretValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "[REDACTED]";
  if (trimmed.length <= 8) return "********";
  return `${"*".repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function maskWebhookUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}/***`;
  } catch {
    return maskSecretValue(value);
  }
}
