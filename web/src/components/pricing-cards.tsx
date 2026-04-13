"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";
import { CheckCircle2, Sparkles } from "lucide-react";

const TIERS: SubscriptionTier[] = ["free", "pro", "team_pro"];

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
      {TIERS.map((tier, index) => {
        const pricing = TIER_PRICING[tier];
        const limits = TIER_LIMITS[tier];
        const isPro = tier === "pro";
        const isTeam = tier === "team_pro";

        return (
          <motion.div 
            key={tier} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.1 }}
            className={`relative flex flex-col h-full rounded-[32px] p-8 md:p-10 transition-all duration-300 ${
              isPro 
                ? "bg-[rgba(255,255,255,0.95)] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08)] border border-[#81e6d9]/40 z-10 scale-105" 
                : "bg-[rgba(255,255,255,0.75)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60"
            } backdrop-blur-[24px] saturate-[150%]`}
            whileHover={{ y: -8, scale: isPro ? 1.06 : 1.02 }}
          >
            {/* Decorative Glow for Pro */}
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
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </span>
                )}
              </div>
              
              <div className="mb-8">
                {pricing.priceMonthly === 0 ? (
                  <div className="text-5xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                    Free
                  </div>
                ) : (
                  <div className="flex items-baseline text-[var(--color-text-primary)]">
                    <span className="text-2xl font-medium mr-1">¥</span>
                    <span className="text-5xl font-semibold tracking-[-0.03em]">{pricing.priceMonthly}</span>
                    <span className="text-[var(--color-text-secondary)] ml-2">/ month</span>
                  </div>
                )}
              </div>

              <ul className="flex flex-col gap-4 mb-10 flex-grow text-[0.95rem] text-[var(--color-text-secondary)]">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPro || isTeam ? "text-[var(--color-accent-apple)]" : "text-[var(--color-text-tertiary)]"}`} />
                  <span>Up to <strong>{limits.maxTeams === Infinity ? "Unlimited" : limits.maxTeams}</strong> teams</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPro || isTeam ? "text-[var(--color-accent-apple)]" : "text-[var(--color-text-tertiary)]"}`} />
                  <span><strong>{limits.maxTeamMembers === Infinity ? "Unlimited" : limits.maxTeamMembers}</strong> members per team</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPro || isTeam ? "text-[var(--color-accent-apple)]" : "text-[var(--color-text-tertiary)]"}`} />
                  <span>Up to <strong>{limits.maxProjects === Infinity ? "Unlimited" : limits.maxProjects}</strong> projects</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPro || isTeam ? "text-[var(--color-accent-apple)]" : "text-[var(--color-text-tertiary)]"}`} />
                  <span><strong>{limits.maxScreenshots === Infinity ? "Unlimited" : limits.maxScreenshots}</strong> screenshots per project</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPro || isTeam ? "text-[var(--color-accent-apple)]" : "text-[var(--color-text-tertiary)]"}`} />
                  <span><strong>{limits.apiRatePerMinute.toLocaleString()}</strong> API requests / min</span>
                </li>
                {limits.canFeatureProject && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[var(--color-accent-apple)]" />
                    <span>Daily featured project slots</span>
                  </li>
                )}
                {limits.canPublishMilestone && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[var(--color-accent-apple)]" />
                    <span>Public milestone display</span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${limits.mcpToolsUnlocked ? "text-[var(--color-accent-apple)]" : "text-[var(--color-text-tertiary)]"}`} />
                  <span>{limits.mcpToolsUnlocked ? "All MCP Tools Unlocked" : "Basic 5 MCP Tools"}</span>
                </li>
              </ul>

              {tier === "free" ? (
                <Link 
                  href="/api/v1/auth/github?redirect=/" 
                  className="w-full py-4 rounded-[16px] bg-black/5 text-[var(--color-text-primary)] font-medium text-center hover:bg-black/10 transition-colors"
                >
                  Login with GitHub
                </Link>
              ) : (
                <motion.button
                  className={`w-full py-4 rounded-[16px] font-medium text-center transition-colors shadow-sm ${
                    isPro 
                      ? "bg-[var(--color-accent-apple)] text-white hover:bg-[#0062cc] shadow-[0_8px_24px_rgba(0,122,255,0.25)]" 
                      : "bg-[#1d1d1f] text-white hover:bg-black shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
                  }`}
                  onClick={() => void startCheckout(tier)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  Upgrade to {pricing.label}
                </motion.button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
