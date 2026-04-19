import { createPrivateKey, createPublicKey, sign as signDetached, verify as verifyDetached } from "crypto";

const DEV_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEINbXlO0ZFe2Fo553tZfrTR406chndlZG7jmeibXWt/wc
-----END PRIVATE KEY-----
`;

function decodeConfiguredPrivateKey(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("BEGIN PRIVATE KEY")) {
    return value;
  }
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function resolvePrivateKeyPem() {
  const configured = decodeConfiguredPrivateKey(process.env.VIBEHUB_LEDGER_SIGNER_PRIV ?? "");
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("VIBEHUB_LEDGER_SIGNER_PRIV is required in production");
  }
  return DEV_PRIVATE_KEY_PEM;
}

let cachedPrivateKey: ReturnType<typeof createPrivateKey> | null = null;
let cachedPublicKeyPem: string | null = null;

function getPrivateKey() {
  if (!cachedPrivateKey) {
    cachedPrivateKey = createPrivateKey(resolvePrivateKeyPem());
  }
  return cachedPrivateKey;
}

export function publicKey() {
  if (!cachedPublicKeyPem) {
    cachedPublicKeyPem = createPublicKey(getPrivateKey()).export({
      format: "pem",
      type: "spki",
    }).toString();
  }
  return cachedPublicKeyPem;
}

export function sign(message: string) {
  return signDetached(null, Buffer.from(message, "utf-8"), getPrivateKey()).toString("base64");
}

export function verify(message: string, signature: string, key = publicKey()) {
  try {
    const publicKeyObject = createPublicKey(key);
    return verifyDetached(
      null,
      Buffer.from(message, "utf-8"),
      publicKeyObject,
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

