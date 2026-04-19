#!/usr/bin/env node

const fs = require("fs");
const crypto = require("crypto");

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function computePayloadHash(payload) {
  return crypto.createHash("sha256").update(stableJson(payload), "utf8").digest("hex");
}

function composeSigningMessage(payloadHash, prevHash) {
  return `${payloadHash}|${prevHash || ""}`;
}

function verifySignature(message, signature, publicKeyPem) {
  try {
    return crypto.verify(
      null,
      Buffer.from(message, "utf8"),
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const out = { checkAnchor: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--bundle") {
      out.bundle = argv[i + 1];
      i += 1;
    } else if (arg === "--check-anchor") {
      out.checkAnchor = true;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.bundle) {
    console.error("Usage: vibehub-verify --bundle <ledger.json> [--check-anchor]");
    process.exit(1);
  }

  const raw = fs.readFileSync(args.bundle, "utf8");
  const bundle = JSON.parse(raw);
  const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
  const publicKey = bundle.publicKey;
  if (!publicKey || entries.length === 0) {
    console.error("Invalid bundle: missing publicKey or entries");
    process.exit(1);
  }

  let prevSignature = null;
  for (const entry of entries) {
    const expectedHash = computePayloadHash(entry.payload || {});
    if (expectedHash !== entry.payloadHash) {
      console.error(`Broken payload hash at ${entry.id}`);
      process.exit(2);
    }
    if ((entry.prevHash || null) !== prevSignature) {
      console.error(`Broken hash chain at ${entry.id}`);
      process.exit(3);
    }
    const ok = verifySignature(
      composeSigningMessage(entry.payloadHash, entry.prevHash),
      entry.signature,
      publicKey
    );
    if (!ok) {
      console.error(`Broken signature at ${entry.id}`);
      process.exit(4);
    }
    if (args.checkAnchor && entry.anchorChain && entry.anchorChain !== "vibehub" && !entry.anchorTxId) {
      console.error(`Missing anchorTxId for anchored entry ${entry.id}`);
      process.exit(5);
    }
    prevSignature = entry.signature;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        totalChecked: entries.length,
        signedBy: bundle.signedBy || "vibehub-signer-v1",
        publicKey,
      },
      null,
      2
    )
  );
}

main();
