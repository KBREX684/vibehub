import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const SALT_LEN = 16;
const KEY_LEN = 64;
const PREFIX = "scrypt$";

/**
 * Password hashing (v7 P0-1). Uses Node scrypt; bcrypt/argon2 are optional upgrades.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  return `${PREFIX}${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored.startsWith(PREFIX)) {
    return false;
  }
  const rest = stored.slice(PREFIX.length);
  const [saltB64, keyB64] = rest.split("$");
  if (!saltB64 || !keyB64) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(keyB64, "base64");
  } catch {
    return false;
  }
  const actual = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
