"use client";

import Link from "next/link";
import { TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";
import type { PaymentProviderKind } from "@/lib/types";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";
import { CountUp } from "@/components/ui";

const TIERS: SubscriptionTier[] = ["free", "pro"];

const TIER_CARD_CLASS_FREE =
  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-[var(--radius-2xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[cubic-bezier(0,0,0.2,1)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]";
const TIER_CARD_CLASS_PRO =
  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-[var(--radius-2xl)] border-[1.5px] border-[var(--color-primary-border)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[cubic-bezier(0,0,0.2,1)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] relative";

const PRIMARY_CTA_CLASS =
  "w-full py-2.5 bg-[var(--color-primary)] text-[var(--color-on-accent)] border border-[var(--color-primary)] text-center text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)] active:scale-[0.98] transition-all duration-150";

const FREE_CTA_CLASS =
  "w-full py-2.5 bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] text-center text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface-hover)] hover:border-[var(--color-text-primary)] active:scale-[0.98] transition-all duration-150 mt-auto";

const ALT_BTN_CLASS =
  "py-2 border border-[var(--color-contrast-border)] text-center font-mono text-xs tracking-wider hover:bg-[var(--color-contrast-surface-hover)] transition-colors";

const RECOMMENDED_TAG_CLASS =
  "inline-flex items-center px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-primary)] text-[var(--color-on-accent)] text-[10px] font-mono font-medium uppercase tracking-wider";

interface FeatureRow {
  labelKey: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { labelKey: "pricing.compare.workspace_storage", free: "1 GB", pro: "10 GB" },
  { labelKey: "pricing.compare.ledger_monthly", free: "100/月", pro: "∞" },
  { labelKey: "pricing.compare.aigc_stamp", free: "基础（本地）", pro: "完整（腾讯/阿里 API）" },
  { labelKey: "pricing.compare.trust_card", free: "基础版", pro: "高级版" },
  { labelKey: "pricing.compare.ledger_anchor", free: false, pro: true },
  { labelKey: "pricing.compare.compliance_report", free: false, pro: true },
  { labelKey: "pricing.compare.verify_cli", free: true, pro: true },
  { labelKey: "pricing.compare.api_keys", free: "2", pro: "10" },
];

export function PricingCards() {
  const { t } = useLanguage();
  const providerLabel = (_provider: PaymentProviderKind) =>
    t("pricing.provider_alipay", "Alipay");

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {TIERS.map((tier) => {
          const pricing = TIER_PRICING[tier];
          const isPro = tier === "pro";
          const tierLabel = isPro ? t("pricing.tier_pro", pricing.label) : t("pricing.tier_free", pricing.label);
          return (
            <div
              key={tier}
              className={`flex flex-col p-8 md:p-10 ${isPro ? TIER_CARD_CLASS_PRO : TIER_CARD_CLASS_FREE}`}
            >
              {isPro && (
                <span
                  className={`absolute -top-3 left-8 ${RECOMMENDED_TAG_CLASS}`}
                >
                  {t("pricing.recommended", "推荐")}
                </span>
              )}
              <div className="flex-grow flex flex-col">
                <p className={`text-[11px] font-mono uppercase tracking-[0.14em] mb-3 ${isPro ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"}`}>
                  {tierLabel}
                </p>

                <div className="mb-6">
                  {pricing.priceMonthly === 0 ? (
                    <div
                      className="text-5xl font-medium tracking-tight text-[var(--color-text-primary)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      ¥0
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline" style={{ fontFamily: "var(--font-mono)" }}>
                        <span className="text-2xl font-medium mr-1 text-[var(--color-text-primary)]">¥</span>
                        <CountUp
                          end={pricing.priceMonthly}
                          duration={1100}
                          className="text-5xl font-medium tracking-tight text-[var(--color-text-primary)]"
                        />
                        <span className="text-sm font-normal ml-2 text-[var(--color-text-secondary)]">/ 月</span>
                      </div>
                      <div className="text-sm text-[var(--color-text-tertiary)]" style={{ fontFamily: "var(--font-mono)" }}>
                        ¥{pricing.priceYearly}/年
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-sm mb-8 text-[var(--color-text-secondary)] leading-relaxed">
                  {isPro
                    ? t("pricing.pro_description_v11", "无限 Ledger · 完整 AIGC 标识 · 至信链锚定 · 月度合规报告 · Trust Card 高级版")
                    : t("pricing.free_description_v11", "1 GB Workspace · 100 ledger/月 · 基础 AIGC 标识 · 公开 Trust Card · vibehub-verify CLI")}
                </p>

                {tier === "free" ? (
                  <Link href="/signup" className={FREE_CTA_CLASS}>
                    {t("pricing.free_cta", "免费开始")}
                  </Link>
                ) : (
                  <div className="mt-auto space-y-3">
                    <button className={PRIMARY_CTA_CLASS} onClick={() => void startCheckout(tier, "alipay")}>
                      {t("pricing.upgrade_alipay", "使用支付宝升级")}
                    </button>
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

        <div className="hidden md:grid grid-cols-[1fr_120px_120px] px-6 py-3 border-b border-[var(--color-border)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-bg-surface)]">
          <span>{t("pricing.compare.feature", "Feature")}</span>
          <span className="text-center">{t("pricing.compare.free", "Free")}</span>
          <span className="text-center">{t("pricing.compare.pro", "Pro")}</span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {FEATURE_ROWS.map((row) => (
            <div key={row.labelKey} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] px-6 py-3 text-sm">
              <span className="text-[var(--color-text-secondary)] mb-2 md:mb-0 md:sticky md:left-0 md:z-10 md:bg-[var(--color-bg-canvas)] md:pr-4">
                {t(row.labelKey)}
              </span>

              <div className="flex md:hidden justify-between text-xs font-mono mb-1">
                <span className="text-[var(--color-text-muted)]">{t("pricing.compare.free", "Free")}</span>
                <span className="text-[var(--color-text-primary)]">{row.free === true ? "✓" : row.free === false ? "—" : row.free}</span>
              </div>
              <div className="flex md:hidden justify-between text-xs font-mono">
                <span className="text-[var(--color-text-muted)]">{t("pricing.compare.pro", "Pro")}</span>
                <span className="text-[var(--color-text-primary)] font-bold">{row.pro === true ? "✓" : row.pro === false ? "—" : row.pro}</span>
              </div>

              <span className="hidden md:block text-center font-mono text-[var(--color-text-secondary)]">
                {row.free === true ? "✓" : row.free === false ? "—" : row.free}
              </span>
              <span className="hidden md:block text-center font-mono text-[var(--color-text-primary)] font-bold">
                {row.pro === true ? "✓" : row.pro === false ? "—" : row.pro}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
