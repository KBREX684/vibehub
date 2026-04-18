"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UpgradeReason } from "@/lib/subscription";
import { UPGRADE_MESSAGES } from "@/lib/subscription";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui";

const UPGRADE_BADGE_CLASS =
  "w-12 h-12 mx-auto rounded-[var(--radius-lg)] bg-[var(--color-accent-apple-subtle)] border border-[var(--color-accent-apple-border)] flex items-center justify-center mb-5";

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
    const toastId = toast.loading("Preparing checkout…");
    try {
      const res = await apiFetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro" }),
      });
      const json = (await res.json()) as { data?: { url?: string }; error?: { message?: string } };
      if (json.data?.url) {
        toast.dismiss(toastId);
        window.location.href = json.data.url;
      } else {
        toast.error(json.error?.message ?? "Could not start checkout. Please try again.", {
          id: toastId,
        });
      }
    } catch {
      toast.error("Network error. Please try again.", { id: toastId });
    }
  }

  if (variant === "modal") {
    return (
      <AnimatePresence>
        {!dismissed ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={msg.title}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--color-overlay-scrim)] backdrop-blur-sm"
              aria-hidden="true"
              onClick={handleDismiss}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)] p-7 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={UPGRADE_BADGE_CLASS}>
                <Sparkles className="w-5 h-5 text-[var(--color-accent-apple)]" aria-hidden="true" />
              </div>

              <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)] mb-2 m-0">
                {msg.title}
              </h3>

              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6 m-0">
                {msg.body}
              </p>

              <div className="flex flex-col gap-2">
                <Button variant="apple" size="md" onClick={handleUpgrade} className="w-full">
                  Upgrade to Pro
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss} className="w-full">
                  Maybe later
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-accent-apple-border)] bg-[var(--color-accent-apple-subtle)] p-3 my-3"
      role="status"
    >
      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-accent-apple-border)] flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-[var(--color-accent-apple)]" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <strong className="block text-sm font-medium text-[var(--color-text-primary)] m-0">
          {msg.title}
        </strong>
        <span className="block text-xs text-[var(--color-text-secondary)] truncate">
          {msg.body}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="apple" size="sm" onClick={handleUpgrade}>
          Upgrade
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
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
