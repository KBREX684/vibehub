"use client";

import { useState } from "react";
import type { UpgradeReason } from "@/lib/subscription";
import { UPGRADE_MESSAGES } from "@/lib/subscription";

interface Props {
  reason: UpgradeReason;
  /** "banner" shows an inline dismissable bar. "modal" shows a centered overlay. Defaults to "banner". */
  variant?: "banner" | "modal";
  onDismiss?: () => void;
}

export function UpgradePrompt({ reason, variant = "banner", onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const msg = UPGRADE_MESSAGES[reason];

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  async function handleUpgrade() {
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro" }),
      });
      const json = (await res.json()) as { data?: { url?: string }; error?: { message?: string } };
      if (json.data?.url) {
        window.location.href = json.data.url;
      } else {
        alert(json.error?.message ?? "Could not start checkout. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  }

  if (variant === "modal") {
    return (
      <div className="upgrade-modal-backdrop" onClick={handleDismiss}>
        <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
          <div className="upgrade-modal-icon">⚡</div>
          <h3 style={{ margin: "0 0 8px" }}>{msg.title}</h3>
          <p className="muted" style={{ margin: "0 0 20px", fontSize: "0.95rem" }}>{msg.body}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="button" style={{ background: "var(--brand)", color: "#fff", border: "none" }} onClick={handleUpgrade}>
              升级到 Pro — ¥29/月
            </button>
            <button className="button ghost" onClick={handleDismiss}>
              稍后再说
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-banner">
      <span className="upgrade-banner-icon">⚡</span>
      <div style={{ flex: 1 }}>
        <strong>{msg.title}</strong>
        <span className="muted" style={{ marginLeft: 8, fontSize: "0.9rem" }}>{msg.body}</span>
      </div>
      <button className="button" style={{ background: "var(--brand)", color: "#fff", border: "none", whiteSpace: "nowrap" }} onClick={handleUpgrade}>
        立即升级
      </button>
      <button className="button ghost" style={{ marginLeft: 6 }} onClick={handleDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

/** Inline gate wrapper — renders children normally, or shows upgrade prompt if blocked. */
export function FeatureGate({
  allowed,
  reason,
  children,
}: {
  allowed: boolean;
  reason: UpgradeReason;
  children: React.ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return <UpgradePrompt reason={reason} variant="banner" />;
}
