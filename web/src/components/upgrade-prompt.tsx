"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UpgradeReason } from "@/lib/subscription";
import { UPGRADE_MESSAGES } from "@/lib/subscription";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

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
        {!dismissed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Heavy Blur Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-[40px] saturate-[150%]"
              onClick={handleDismiss}
            />
            
            {/* Spring Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
              className="relative w-full max-w-md bg-[rgba(255,255,255,0.85)] border border-white/60 rounded-[32px] p-8 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.1)] text-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative Glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#f5ebd4] rounded-full blur-[64px] opacity-60 pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#81e6d9] rounded-full blur-[64px] opacity-40 pointer-events-none" />

              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#f5ebd4] to-[#81e6d9] rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3">
                  {msg.title}
                </h3>
                
                <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.6] mb-8">
                  {msg.body}
                </p>
                
                <div className="flex flex-col gap-3">
                  <motion.button 
                    className="w-full py-4 rounded-[16px] bg-[var(--color-accent-apple)] text-white font-semibold text-[1.05rem] shadow-[0_8px_24px_rgba(0,122,255,0.25)] hover:bg-[#0062cc] transition-colors flex items-center justify-center gap-2"
                    onClick={handleUpgrade}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    Upgrade to Pro <ChevronRight className="w-5 h-5" />
                  </motion.button>
                  
                  <motion.button 
                    className="w-full py-3 rounded-[16px] bg-transparent text-[var(--color-text-secondary)] font-medium hover:bg-black/5 transition-colors"
                    onClick={handleDismiss}
                    whileTap={{ scale: 0.97 }}
                  >
                    Maybe Later
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 bg-gradient-to-r from-[#f5ebd4]/20 to-[#81e6d9]/20 border border-[#81e6d9]/40 rounded-[16px] p-4 my-4 shadow-sm"
    >
      <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-[#0d9488]" />
      </div>
      
      <div className="flex-1 min-w-0">
        <strong className="block text-[0.95rem] text-[var(--color-text-primary)] mb-0.5">{msg.title}</strong>
        <span className="block text-[0.85rem] text-[var(--color-text-secondary)] truncate">{msg.body}</span>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <motion.button 
          className="px-4 py-2 rounded-[980px] bg-[var(--color-accent-apple)] text-white text-sm font-medium whitespace-nowrap shadow-sm hover:bg-[#0062cc] transition-colors"
          onClick={handleUpgrade}
          whileTap={{ scale: 0.96 }}
        >
          Upgrade
        </motion.button>
        <motion.button 
          className="p-2 rounded-full text-[var(--color-text-tertiary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] transition-colors"
          onClick={handleDismiss}
          whileTap={{ scale: 0.9 }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </motion.button>
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
