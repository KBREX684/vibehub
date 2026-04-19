import { createHash } from "crypto";
import type { LedgerEntry } from "@/lib/types";
import { publicKey, verify } from "@/lib/ledger/signer";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`).join(",")}}`;
}

export function computePayloadHash(payload: unknown) {
  return createHash("sha256").update(stableSerialize(payload), "utf-8").digest("hex");
}

export function composeSigningMessage(payloadHash: string, prevHash?: string | null) {
  return `${payloadHash}|${prevHash ?? ""}`;
}

export function verifyEntry(entry: Pick<LedgerEntry, "id" | "payload" | "payloadHash" | "prevHash" | "signature">, prevSignature: string | null, key = publicKey()) {
  const computedPayloadHash = computePayloadHash(entry.payload);
  if (computedPayloadHash !== entry.payloadHash) {
    return false;
  }
  if ((entry.prevHash ?? null) !== prevSignature) {
    return false;
  }
  return verify(composeSigningMessage(entry.payloadHash, entry.prevHash), entry.signature, key);
}

export function verifyBundle(entries: Array<Pick<LedgerEntry, "id" | "payload" | "payloadHash" | "prevHash" | "signature">>, key = publicKey()) {
  let prevSignature: string | null = null;
  let checked = 0;
  for (const entry of entries) {
    checked += 1;
    if (!verifyEntry(entry, prevSignature, key)) {
      return {
        ok: false as const,
        brokenAt: entry.id,
        totalChecked: checked,
        signedBy: "vibehub-signer-v1",
        publicKey: key,
      };
    }
    prevSignature = entry.signature;
  }
  return {
    ok: true as const,
    brokenAt: null,
    totalChecked: checked,
    signedBy: "vibehub-signer-v1",
    publicKey: key,
  };
}

