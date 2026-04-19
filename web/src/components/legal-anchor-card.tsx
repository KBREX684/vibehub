"use client";

/**
 * LegalAnchorCard — Displays judicial chain anchor details.
 *
 * Anchored state: chain name + txId (copyable) + verifiedAt + proofUrl + CLI command
 * Unanchored state: placeholder + upgrade prompt
 */

import { useState } from "react";
import { Modal } from "@/components/ui";
import { CopyButton } from "@/components/ui";
import { useLanguage } from "@/app/context/LanguageContext";
import { ExternalLink, Shield, Lock } from "lucide-react";

interface LegalAnchorCardProps {
  open: boolean;
  onClose: () => void;
  anchor?: {
    chain: "zhixin" | "baoquan";
    txId: string;
    verifiedAt: string;
    proofUrl: string | null;
  } | null;
  /** If true, show upgrade prompt for unanchored state */
  isFreeUser?: boolean;
}

const CHAIN_LABELS: Record<string, string> = {
  zhixin: "至信链",
  baoquan: "保全网",
};

export function LegalAnchorCard({ open, onClose, anchor, isFreeUser }: LegalAnchorCardProps) {
  const { t } = useLanguage();

  const isAnchored = !!anchor;

  return (
    <Modal open={open} onClose={onClose} title={isAnchored ? t("legal_anchor.title", "已锚定到司法链") : t("legal_anchor.title_unanchored", "司法链锚定")}>
      {isAnchored ? (
        <div className="space-y-4">
          {/* Chain badge */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--color-success)]" />
            <span className="text-sm font-semibold text-[var(--color-success)]">
              {CHAIN_LABELS[anchor.chain] ?? anchor.chain}
            </span>
          </div>

          {/* Tx ID */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Transaction ID
            </p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 flex-1 break-all">
                {anchor.txId}
              </code>
              <CopyButton value={anchor.txId} />
            </div>
          </div>

          {/* Verified at */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              {t("legal_anchor.verified_at", "验证时间")}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {new Date(anchor.verifiedAt).toLocaleString("zh-CN")}
            </p>
          </div>

          {/* Proof URL */}
          {anchor.proofUrl && (
            <div>
              <a
                href={anchor.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-apple)] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t("legal_anchor.external_verify", "外部校验")}
              </a>
            </div>
          )}

          {/* CLI verify command */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              {t("legal_anchor.verify_cli", "用 vibehub-verify 命令本地校验")}
            </p>
            <div className="code-block text-xs !p-3">
              <code>npx vibehub-verify --tx {anchor.txId}</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isFreeUser
              ? t("legal_anchor.upgrade_prompt", "锚定到司法链是 Pro 功能。开通后每月可锚定无限条 Ledger，为你的 AI 工作背书。")
              : t("legal_anchor.not_anchored", "此条目尚未锚定到司法链。")}
          </p>
          {isFreeUser && (
            <a
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
            >
              {t("pro_required.cta", "升级 Pro")}
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
