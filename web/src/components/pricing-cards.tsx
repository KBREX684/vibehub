"use client";

import Link from "next/link";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";
import type { PaymentProviderKind } from "@/lib/types";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";
import { CountUp } from "@/components/ui";

const TIERS: SubscriptionTier[] = ["free", "pro"];

const TIER_CARD_CLASS_FREE =
  "bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]";
const TIER_CARD_CLASS_PRO =
  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_var(--color-featured-highlight)]";

const PRIMARY_CTA_CLASS =
  "w-full py-3 bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] border border-[var(--color-text-primary)] text-center font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity";

const FREE_CTA_CLASS =
  "w-full py-3 border border-[var(--color-border-strong)] text-center font-mono text-sm uppercase tracking-wider hover:bg-[var(--color-bg-surface-hover)] transition-colors mt-auto";

const ALT_BTN_CLASS =
  "py-2 border border-[var(--color-contrast-border)] text-center font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-contrast-surface-hover)] transition-colors";

const RECOMMENDED_TAG_CLASS =
  "inline-flex items-center px-2 py-1 border border-[var(--color-border-strong)] bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] text-[10px] font-mono font-bold uppercase tracking-wider";

const COMPARE_HEADER_CLASS =
  "hidden md:grid grid-cols-[1fr_120px_120px] px-6 py-3 border-b border-[var(--color-border)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-bg-surface)]";

interface FeatureRow {
  labelKey: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { labelKey: "pricing.compare.community", free: true, pro: true },
  { labelKey: "pricing.compare.projects", free: `${TIER_LIMITS.free.maxProjects}`, pro: "∞" },
  { labelKey: "pricing.compare.teams", free: `${TIER_LIMITS.free.maxTeams}`, pro: `${TIER_LIMITS.pro.maxTeams}` },
  { labelKey: "pricing.compare.team_members", free: `${TIER_LIMITS.free.maxTeamMembers}`, pro: `${TIER_LIMITS.pro.maxTeamMembers}` },
  { labelKey: "pricing.compare.api_rate", free: `${TIER_LIMITS.free.apiRatePerMinute}`, pro: `${TIER_LIMITS.pro.apiRatePerMinute}` },
  { labelKey: "pricing.compare.api_keys", free: `${TIER_LIMITS.free.maxApiKeys}`, pro: `${TIER_LIMITS.pro.maxApiKeys}` },
  { labelKey: "pricing.compare.mcp_tools", free: "basic", pro: "all" },
  { labelKey: "pricing.compare.feature_project", free: false, pro: true },
  { labelKey: "pricing.compare.publish_milestones", free: false, pro: true },
  { labelKey: "pricing.compare.priority_match", free: false, pro: true },
  { labelKey: "pricing.compare.export_logs", free: false, pro: true },
];

export function PricingCards() {
  const { t } = useLanguage();
  const providerLabel = (provider: PaymentProviderKind) => {
    if (provider === "alipay") return t("pricing.provider_alipay", "Alipay");
    if (provider === "wechatpay") return t("pricing.provider_wechat", "WeChat Pay");
    return "Stripe";
  };

  async function startCheckout(tier: SubscriptionTier, paymentProvider: PaymentProviderKind) {
    const toastId = toast.loading(
      t("pricing.checkout_preparing", "Preparing {provider} checkout...").replace("{provider}", providerLabel(paymentProvider))
    );
    try {
      const res = await apiFetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, paymentProvider }),
      });
      const json = (await res.json()) as { data?: { url?: string }; error?: { message?: string } };
      if (json.data?.url) {
        toast.dismiss(toastId);
        window.location.href = json.data.url;
      } else {
        toast.error(json.error?.message ?? t("pricing.checkout_failed", "Unable to start checkout right now. Please try again shortly."), { id: toastId });
      }
    } catch {
      toast.error(t("pricing.network_error", "Network error. Please try again."), { id: toastId });
    }
  }

  return (
    <div className="max-w-4xl mx-auto mb-16 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)] mb-12">
        {TIERS.map((tier) => {
          const pricing = TIER_PRICING[tier];
          const isPro = tier === "pro";
          return (
            <div
              key={tier}
              className={`flex flex-col p-8 md:p-10 transition-colors ${isPro ? TIER_CARD_CLASS_PRO : TIER_CARD_CLASS_FREE}`}
            >
              <div className="flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-tight m-0">{pricing.label}</h2>
                  {isPro && <span className={RECOMMENDED_TAG_CLASS}>{t("pricing.recommended", "Recommended")}</span>}
                </div>

                <div className="mb-6">
                  {pricing.priceMonthly === 0 ? (
                    <div className="text-5xl font-mono font-bold tracking-tight">{t("pricing.free_price", "Free")}</div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-2xl font-mono font-medium mr-1">¥</span>
                      <CountUp
                        end={pricing.priceMonthly}
                        duration={1100}
                        className="text-5xl font-mono font-bold tracking-tight"
                      />
                      <span className="text-sm font-mono ml-2 opacity-70">{t("pricing.per_month", "/ month")}</span>
                    </div>
                  )}
                </div>

                <p className={`text-sm mb-8 ${isPro ? "opacity-80" : "text-[var(--color-text-secondary)]"}`}>
                  {isPro
                    ? t("pricing.pro_description", "More projects, more collaboration capacity, higher API and MCP limits, and stronger discovery benefits.")
                    : t("pricing.free_description", "Publish projects, join discussions, and use the core collaboration loop before you decide to upgrade.")}
                </p>

                {tier === "free" ? (
                  <Link href="/signup" className={FREE_CTA_CLASS}>
                    {t("pricing.free_cta", "Get started free")}
                  </Link>
                ) : (
                  <div className="mt-auto space-y-3">
                    <button className={PRIMARY_CTA_CLASS} onClick={() => void startCheckout(tier, "alipay")}>
                      {t("pricing.upgrade_alipay", "Upgrade with Alipay")}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className={ALT_BTN_CLASS} onClick={() => void startCheckout(tier, "wechatpay")}>
                        {t("pricing.upgrade_wechat", "WeChat Pay")}
                      </button>
                      <button className={ALT_BTN_CLASS} onClick={() => void startCheckout(tier, "stripe")}>
                        {t("pricing.upgrade_stripe", "Cards / Stripe")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-[var(--color-border)] bg-[var(--color-bg-canvas)] overflow-hidden animate-fade-in-up delay-100">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)] m-0">{t("pricing.compare_title", "Plan comparison")}</h3>
        </div>

        <div className={COMPARE_HEADER_CLASS}>
          <span>{t("pricing.compare.feature", "Feature")}</span>
          <span className="text-center">Free</span>
          <span className="text-center">Pro</span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {FEATURE_ROWS.map((row) => (
            <div key={row.labelKey} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] px-6 py-3 text-sm">
              <span className="text-[var(--color-text-secondary)] mb-2 md:mb-0 md:sticky md:left-0 md:z-10 md:bg-[var(--color-bg-canvas)] md:pr-4 md:shadow-[12px_0_18px_-18px_rgba(0,0,0,0.65)]">
                {t(row.labelKey)}
              </span>

              <div className="flex md:hidden justify-between text-xs font-mono mb-1">
                <span className="text-[var(--color-text-muted)]">Free</span>
                <span className="text-[var(--color-text-primary)]">{row.free === true ? "✓" : row.free === false ? "—" : row.free === "basic" ? t("pricing.compare.basic_tools", "Basic tools") : row.free}</span>
              </div>
              <div className="flex md:hidden justify-between text-xs font-mono">
                <span className="text-[var(--color-text-muted)]">Pro</span>
                <span className="text-[var(--color-text-primary)] font-bold">{row.pro === true ? "✓" : row.pro === false ? "—" : row.pro === "all" ? t("pricing.compare.all_tools", "All unlocked tools") : row.pro}</span>
              </div>

              <span className="hidden md:block text-center font-mono text-[var(--color-text-secondary)]">
                {row.free === true ? "✓" : row.free === false ? "—" : row.free === "basic" ? t("pricing.compare.basic_tools", "Basic tools") : row.free}
              </span>
              <span className="hidden md:block text-center font-mono text-[var(--color-text-primary)] font-bold">
                {row.pro === true ? "✓" : row.pro === false ? "—" : row.pro === "all" ? t("pricing.compare.all_tools", "All unlocked tools") : row.pro}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
