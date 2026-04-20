"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Tooltip } from "./tooltip";

export type LedgerStampState = "default" | "anchored" | "failed";

export interface LedgerStampBadgeProps {
  signature: string;
  state?: LedgerStampState;
  className?: string;
  onClick?: () => void;
}

export function LedgerStampBadge({
  signature,
  state = "default",
  className = "",
  onClick,
}: LedgerStampBadgeProps) {
  // Format: #{前8字符}·{后2字符}
  const shortHash = signature.length >= 10
    ? `#${signature.slice(0, 8)}·${signature.slice(-2)}`
    : `#${signature}`;

  const stateConfig: Record<LedgerStampState, {
    border: string;
    text: string;
    bg: string;
    icon?: typeof Check;
    iconColor?: string;
    tooltip: string;
  }> = {
    default: {
      border: "var(--color-border-strong)",
      text: "var(--color-text-tertiary)",
      bg: "transparent",
      tooltip: "未锚定 · 点击可查看详情",
    },
    anchored: {
      border: "var(--color-success)",
      text: "var(--color-success)",
      bg: "var(--color-success-subtle)",
      icon: Check,
      iconColor: "var(--color-success)",
      tooltip: "已锚定至司法链 · 可验证",
    },
    failed: {
      border: "var(--color-error)",
      text: "var(--color-error)",
      bg: "var(--color-error-subtle)",
      icon: X,
      iconColor: "var(--color-error)",
      tooltip: "校验失败 · 哈希链断裂",
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  const content = (
    <span
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1",
        "px-1.5 py-0.5 rounded-[var(--radius-sm)]",
        "border border-dashed font-mono text-[11px] font-medium",
        onClick && "cursor-pointer hover:opacity-80",
        className,
      ].join(" ")}
      style={{
        borderColor: config.border,
        color: config.text,
        backgroundColor: config.bg,
      }}
    >
      {Icon && <Icon className="w-3 h-3" style={{ color: config.iconColor }} />}
      {shortHash}
    </span>
  );

  return (
    <Tooltip content={config.tooltip} delay={200}>
      {content}
    </Tooltip>
  );
}
