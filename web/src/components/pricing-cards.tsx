"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";
import { CheckCircle2, Sparkles, X } from "lucide-react";

const TIERS: SubscriptionTier[] = ["free", "pro"];

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: "Browse, post, comment, like, follow", free: true, pro: true },
  { label: "Projects", free: `${TIER_LIMITS.free.maxProjects}`, pro: "Unlimited" },
  { label: "Screenshots per project", free: `${TIER_LIMITS.free.maxScreenshots}`, pro: `${TIER_LIMITS.pro.maxScreenshots}` },
  { label: "Teams", free: `${TIER_LIMITS.free.maxTeams}`, pro: `${TIER_LIMITS.pro.maxTeams}` },
  { label: "Members per team", free: `${TIER_LIMITS.free.maxTeamMembers}`, pro: `${TIER_LIMITS.pro.maxTeamMembers}` },
  { label: "API requests / min", free: `${TIER_LIMITS.free.apiRatePerMinute}`, pro: `${TIER_LIMITS.pro.apiRatePerMinute}` },
  { label: "API keys", free: `${TIER_LIMITS.free.maxApiKeys}`, pro: `${TIER_LIMITS.pro.maxApiKeys}` },
  { label: "MCP tools", free: "5 basic", pro: "All 9" },
  { label: "Daily featured project slot", free: false, pro: true },
  { label: "Pro badge on profile", free: false, pro: true },
  { label: "Public milestone display", free: false, pro: true },
  { label: "Priority collaboration matching", free: false, pro: true },
  { label: "Activity log export", free: false, pro: true },
];

export function PricingCards() {
  async function startCheckout(tier: SubscriptionTier) {
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
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

  return (
    <div className="max-w-4xl mx-auto mb-16">
      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {TIERS.map((tier, index) => {
          const pricing = TIER_PRICING[tier];
          const isPro = tier === "pro";

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.1 }}
              className={`relative flex flex-col h-full rounded-[32px] p-8 md:p-10 transition-all duration-300 ${
                isPro
                  ? "bg-[rgba(255,255,255,0.95)] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08)] border border-[#81e6d9]/40 z-10"
                  : "bg-[rgba(255,255,255,0.75)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60"
              } backdrop-blur-[24px] saturate-[150%]`}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              {isPro && (
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#81e6d9] rounded-full blur-[64px] opacity-30 pointer-events-none" />
              )}

              <div className="relative z-10 flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">
                    {pricing.label}
                  </h2>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[980px] bg-[#81e6d9]/20 text-[#0d9488] text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" /> Recommended
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  {pricing.priceMonthly === 0 ? (
                    <div className="text-5xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                      Free
                    </div>
                  ) : (
                    <div className="flex items-baseline text-[var(--color-text-primary)]">
                      <span className="text-2xl font-medium mr-1">$</span>
                      <span className="text-5xl font-semibold tracking-[-0.03em]">{pricing.priceMonthly}</span>
                      <span className="text-[var(--color-text-secondary)] ml-2">/ month</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-[var(--color-text-secondary)] mb-8">
                  {isPro
                    ? "More space, more exposure, and full developer tooling for serious builders."
                    : "Full community access. Everything you need to start building and sharing."}
                </p>

                {tier === "free" ? (
                  <Link
                    href="/api/v1/auth/github?redirect=/"
                    className="w-full py-4 rounded-[16px] bg-black/5 text-[var(--color-text-primary)] font-medium text-center hover:bg-black/10 transition-colors mt-auto"
                  >
                    Get Started Free
                  </Link>
                ) : (
                  <motion.button
                    className="w-full py-4 rounded-[16px] font-medium text-center transition-colors shadow-sm bg-[var(--color-accent-apple)] text-white hover:bg-[#0062cc] shadow-[0_8px_24px_rgba(0,122,255,0.25)] mt-auto"
                    onClick={() => void startCheckout(tier)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    Upgrade to Pro
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-8 py-6 border-b border-black/5">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">Feature Comparison</h3>
        </div>
        <div className="divide-y divide-black/5">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px] px-8 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center">Pro</span>
          </div>
          {FEATURE_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_120px_120px] px-8 py-3 text-sm">
              <span className="text-[var(--color-text-secondary)]">{row.label}</span>
              <span className="text-center">
                {row.free === true ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-text-tertiary)] mx-auto" />
                ) : row.free === false ? (
                  <X className="w-4 h-4 text-[var(--color-text-muted)]/40 mx-auto" />
                ) : (
                  <span className="text-[var(--color-text-secondary)] font-medium">{row.free}</span>
                )}
              </span>
              <span className="text-center">
                {row.pro === true ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-accent-apple)] mx-auto" />
                ) : row.pro === false ? (
                  <X className="w-4 h-4 text-[var(--color-text-muted)]/40 mx-auto" />
                ) : (
                  <span className="text-[var(--color-text-primary)] font-semibold">{row.pro}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
