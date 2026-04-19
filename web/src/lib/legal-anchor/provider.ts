import { createHash } from "crypto";
import type { LedgerBundle } from "@/lib/repositories/ledger.repository";
import { RepositoryError } from "@/lib/repository-errors";
import { computeLedgerBundleHash } from "@/lib/ledger/export-utils";
import { anchorLedgerBundleWithBaoquan } from "@/lib/legal-anchor/baoquan";
import { anchorLedgerBundleWithZhixin } from "@/lib/legal-anchor/zhixin";

export type LegalAnchorProvider = "zhixin" | "baoquan";

export interface AnchorLedgerBundleInput {
  workspaceId: string;
  requestedByUserId: string;
  bundle: LedgerBundle;
  exportedAt?: string;
}

export interface LegalAnchorReceipt {
  provider: LegalAnchorProvider;
  txId: string;
  href: string;
  verifiedAt: string;
  label: string;
  bundleHash: string;
  entryCount: number;
}

export function buildAnchorFingerprint(input: {
  provider: LegalAnchorProvider;
  workspaceId: string;
  bundleHash: string;
}) {
  return createHash("sha256")
    .update(`${input.provider}:${input.workspaceId}:${input.bundleHash}`, "utf-8")
    .digest("hex");
}

export function createFallbackReceipt(
  provider: LegalAnchorProvider,
  input: AnchorLedgerBundleInput,
  label: string
): LegalAnchorReceipt {
  const bundleHash = computeLedgerBundleHash(input.bundle);
  const fingerprint = buildAnchorFingerprint({
    provider,
    workspaceId: input.workspaceId,
    bundleHash,
  });
  const txId = `${provider}_${fingerprint.slice(0, 24)}`;
  return {
    provider,
    txId,
    href: `https://verify.vibehub.local/${provider}/${txId}`,
    verifiedAt: input.exportedAt ?? new Date().toISOString(),
    label,
    bundleHash,
    entryCount: input.bundle.entries.length,
  };
}

export async function anchorLedgerBundle(
  provider: LegalAnchorProvider,
  input: AnchorLedgerBundleInput
): Promise<LegalAnchorReceipt> {
  if (input.bundle.entries.length === 0) {
    throw new RepositoryError("INVALID_INPUT", "Cannot anchor an empty ledger bundle", 400);
  }
  switch (provider) {
    case "zhixin":
      return anchorLedgerBundleWithZhixin(input);
    case "baoquan":
      return anchorLedgerBundleWithBaoquan(input);
    default:
      throw new RepositoryError("INVALID_INPUT", `Unknown legal anchor provider: ${String(provider)}`, 400);
  }
}
