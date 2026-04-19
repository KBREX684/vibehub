import { RepositoryError } from "@/lib/repository-errors";
import type { AnchorLedgerBundleInput, LegalAnchorReceipt } from "@/lib/legal-anchor/provider";
import { computeLedgerBundleHash } from "@/lib/ledger/export-utils";
import { createFallbackReceipt } from "@/lib/legal-anchor/provider";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export async function anchorLedgerBundleWithBaoquan(
  input: AnchorLedgerBundleInput
): Promise<LegalAnchorReceipt> {
  const endpoint = env("BAOQUAN_LEDGER_ANCHOR_ENDPOINT");
  const apiKey = env("BAOQUAN_LEDGER_ANCHOR_API_KEY");
  if (!endpoint || !apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new RepositoryError("INTERNAL", "保全网锚定服务未配置", 503);
    }
    return createFallbackReceipt("baoquan", input, "保全网锚定");
  }

  const bundleHash = computeLedgerBundleHash(input.bundle);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      workspaceId: input.workspaceId,
      requestedByUserId: input.requestedByUserId,
      exportedAt: input.exportedAt ?? new Date().toISOString(),
      bundleHash,
      entryCount: input.bundle.entries.length,
      signedBy: input.bundle.signedBy,
      publicKey: input.bundle.publicKey,
    }),
  });

  if (!response.ok) {
    throw new RepositoryError("INTERNAL", `保全网锚定失败 (${response.status})`, 502);
  }

  const data = (await response.json()) as {
    txId?: string;
    href?: string;
    verifiedAt?: string;
    label?: string;
  };
  if (!data.txId || !data.href) {
    throw new RepositoryError("INTERNAL", "保全网锚定返回无效结果", 502);
  }

  return {
    provider: "baoquan",
    txId: data.txId,
    href: data.href,
    verifiedAt: data.verifiedAt ?? input.exportedAt ?? new Date().toISOString(),
    label: data.label ?? "保全网锚定",
    bundleHash,
    entryCount: input.bundle.entries.length,
  };
}
