import { createHash } from "crypto";
import type { AigcComplianceAuditTrailItem, TrustCard } from "@/lib/types";
import type { LedgerBundle } from "@/lib/repositories/ledger.repository";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeLedgerBundleHash(bundle: LedgerBundle) {
  return createHash("sha256").update(stableJson(bundle)).digest("hex");
}

export function renderLedgerBundleTxt(bundle: LedgerBundle, params: {
  workspaceId: string;
  exportedAt?: string;
}) {
  const exportedAt = params.exportedAt ?? new Date().toISOString();
  const bundleHash = computeLedgerBundleHash(bundle);
  const lines = [
    "VibeHub Ledger Export",
    `workspaceId\t${params.workspaceId}`,
    `exportedAt\t${exportedAt}`,
    `signedBy\t${bundle.signedBy}`,
    `publicKey\t${bundle.publicKey}`,
    `bundleHash\t${bundleHash}`,
    "verify\tvibehub-verify --bundle <file>",
    "",
    "id\tsignedAt\tactionKind\tactorType\tactorId\ttargetType\ttargetId\tpayloadHash\tsignature",
    ...bundle.entries.map((entry) =>
      [
        entry.id,
        entry.signedAt,
        entry.actionKind,
        entry.actorType,
        entry.actorId,
        entry.targetType ?? "",
        entry.targetId ?? "",
        entry.payloadHash,
        entry.signature,
      ].join("\t")
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function renderAigcAuditTrailTxt(items: AigcComplianceAuditTrailItem[], params?: {
  exportedAt?: string;
  month?: string;
}) {
  const exportedAt = params?.exportedAt ?? new Date().toISOString();
  const lines = [
    "VibeHub AIGC Compliance Audit Trail",
    `exportedAt\t${exportedAt}`,
    `month\t${params?.month ?? "all"}`,
    "",
    "stampId\tworkspaceTitle\tfilename\tprovider\tmode\tvisibleLabel\tstampedAt",
    ...items.map((item) =>
      [
        item.stampId,
        item.workspaceTitle,
        item.filename,
        item.provider,
        item.mode,
        item.visibleLabel,
        item.stampedAt,
      ].join("\t")
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function getTrustCardSummaryLines(card: TrustCard) {
  return [
    `姓名\t${card.creatorName}`,
    `主标题\t${card.headline ?? ""}`,
    `服务范围\t${card.serviceScope ?? ""}`,
    `城市\t${card.city ?? ""}`,
    `网站\t${card.websiteUrl ?? ""}`,
    `证明链接\t${card.proofUrl ?? ""}`,
    `公开作品数\t${card.metrics.publicWorkCount}`,
    `Ledger 条数\t${card.metrics.ledgerEntryCount}`,
    `快照数\t${card.metrics.snapshotCount}`,
    `AIGC 加标数\t${card.metrics.stampedArtifactCount}`,
    `平均响应小时\t${card.metrics.avgResponseHours}`,
    `注册天数\t${card.metrics.registrationDays}`,
  ];
}
