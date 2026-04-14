"use client";

import Link from "next/link";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)] mb-12">
        {TIERS.map((tier) => {
          const pricing = TIER_PRICING[tier];
          const isPro = tier === "pro";

          return (
            <div
              key={tier}
              className={`flex flex-col p-8 md:p-10 transition-colors ${
                isPro
                  ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                  : "bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
              }`}
            >
              <div className="flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight m-0">
                    {pricing.label}
                  </h2>
                  {isPro && (
                    <span className="inline-flex items-center px-2 py-1 border border-[var(--color-text-inverse)] text-[10px] font-mono font-bold uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  {pricing.priceMonthly === 0 ? (
                    <div className="text-5xl font-mono font-bold tracking-tight">
                      Free
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-2xl font-mono font-medium mr-1">$</span>
                      <span className="text-5xl font-mono font-bold tracking-tight">{pricing.priceMonthly}</span>
                      <span className="text-sm font-mono ml-2 opacity-70">/ mo</span>
                    </div>
                  )}
                </div>

                <p className={`text-sm mb-8 ${isPro ? "opacity-80" : "text-[var(--color-text-secondary)]"}`}>
                  {isPro
                    ? "More space, more exposure, and full developer tooling for serious builders."
                    : "Full community access. Everything you need to start building and sharing."}
                </p>

                {tier === "free" ? (
                  <Link
                    href="/api/v1/auth/github?redirect=/"
                    className="w-full py-3 border border-[var(--color-border-strong)] text-center font-mono text-sm uppercase tracking-wider hover:bg-[var(--color-bg-surface-hover)] transition-colors mt-auto"
                  >
                    Get Started Free
                  </Link>
                ) : (
                  <button
                    className="w-full py-3 bg-[var(--color-text-inverse)] text-[var(--color-primary)] border border-[var(--color-text-inverse)] text-center font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity mt-auto"
                    onClick={() => void startCheckout(tier)}
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="border border-[var(--color-border)] bg-[var(--color-bg-canvas)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)] m-0">Feature Comparison</h3>
        </div>
        
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-[1fr_120px_120px] px-6 py-3 border-b border-[var(--color-border)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-bg-surface)]">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center">Pro</span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {FEATURE_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px] px-6 py-3 text-sm">
              <span className="text-[var(--color-text-secondary)] mb-2 md:mb-0">{row.label}</span>
              
              {/* Mobile Labels */}
              <div className="flex md:hidden justify-between text-xs font-mono mb-1">
                <span className="text-[var(--color-text-muted)]">Free</span>
                <span className="text-[var(--color-text-primary)]">
                  {row.free === true ? "+" : row.free === false ? "-" : row.free}
                </span>
              </div>
              <div className="flex md:hidden justify-between text-xs font-mono">
                <span className="text-[var(--color-text-muted)]">Pro</span>
                <span className="text-[var(--color-text-primary)] font-bold">
                  {row.pro === true ? "+" : row.pro === false ? "-" : row.pro}
                </span>
              </div>

              {/* Desktop Values */}
              <span className="hidden md:block text-center font-mono text-[var(--color-text-secondary)]">
                {row.free === true ? "+" : row.free === false ? "-" : row.free}
              </span>
              <span className="hidden md:block text-center font-mono text-[var(--color-text-primary)] font-bold">
                {row.pro === true ? "+" : row.pro === false ? "-" : row.pro}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
