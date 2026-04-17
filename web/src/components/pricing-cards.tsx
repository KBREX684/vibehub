"use client";

import Link from "next/link";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";
import type { PaymentProviderKind } from "@/lib/types";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

const TIERS: SubscriptionTier[] = ["free", "pro"];

const TIER_CARD_CLASS_FREE =
  "bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]";
const TIER_CARD_CLASS_PRO =
  "bg-[var(--color-primary)] text-[var(--color-text-inverse)]";

const PRIMARY_CTA_CLASS =
  "w-full py-3 bg-[var(--color-text-inverse)] text-[var(--color-primary)] border border-[var(--color-text-inverse)] text-center font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity";

const FREE_CTA_CLASS =
  "w-full py-3 border border-[var(--color-border-strong)] text-center font-mono text-sm uppercase tracking-wider hover:bg-[var(--color-bg-surface-hover)] transition-colors mt-auto";

const ALT_BTN_CLASS =
  "py-2 border border-[rgba(255,255,255,0.4)] text-center font-mono text-xs uppercase tracking-wider hover:bg-[rgba(255,255,255,0.1)] transition-colors";

const RECOMMENDED_TAG_CLASS =
  "inline-flex items-center px-2 py-1 border border-[var(--color-text-inverse)] text-[10px] font-mono font-bold uppercase tracking-wider";

const COMPARE_HEADER_CLASS =
  "hidden md:grid grid-cols-[1fr_120px_120px] px-6 py-3 border-b border-[var(--color-border)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-bg-surface)]";

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: "浏览、发帖、评论、点赞、关注", free: true, pro: true },
  { label: "Projects", free: `${TIER_LIMITS.free.maxProjects}`, pro: "Unlimited" },
  { label: "团队数", free: `${TIER_LIMITS.free.maxTeams}`, pro: `${TIER_LIMITS.pro.maxTeams}` },
  { label: "每个团队成员上限", free: `${TIER_LIMITS.free.maxTeamMembers}`, pro: `${TIER_LIMITS.pro.maxTeamMembers}` },
  { label: "API 请求 / 分钟", free: `${TIER_LIMITS.free.apiRatePerMinute}`, pro: `${TIER_LIMITS.pro.apiRatePerMinute}` },
  { label: "API Key 数", free: `${TIER_LIMITS.free.maxApiKeys}`, pro: `${TIER_LIMITS.pro.maxApiKeys}` },
  { label: "MCP 工具", free: "基础工具", pro: "全部已开放工具" },
  { label: "项目曝光权益", free: false, pro: true },
  { label: "公开里程碑展示", free: false, pro: true },
  { label: "优先协作匹配", free: false, pro: true },
  { label: "活动日志导出", free: false, pro: true },
];

function providerLabel(provider: PaymentProviderKind) {
  if (provider === "alipay") return "支付宝";
  if (provider === "wechatpay") return "微信支付";
  return "Stripe";
}

export function PricingCards() {
  async function startCheckout(tier: SubscriptionTier, paymentProvider: PaymentProviderKind) {
    const toastId = toast.loading(`正在准备 ${providerLabel(paymentProvider)} 结算...`);
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
        toast.error(json.error?.message ?? "暂时无法发起支付，请稍后再试。", { id: toastId });
      }
    } catch {
      toast.error("网络异常，请稍后再试。", { id: toastId });
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
                  {isPro && <span className={RECOMMENDED_TAG_CLASS}>中国主推</span>}
                </div>

                <div className="mb-6">
                  {pricing.priceMonthly === 0 ? (
                    <div className="text-5xl font-mono font-bold tracking-tight">免费</div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-2xl font-mono font-medium mr-1">¥</span>
                      <span className="text-5xl font-mono font-bold tracking-tight">{pricing.priceMonthly}</span>
                      <span className="text-sm font-mono ml-2 opacity-70">/ 月</span>
                    </div>
                  )}
                </div>

                <p className={`text-sm mb-8 ${isPro ? "opacity-80" : "text-[var(--color-text-secondary)]"}`}>
                  {isPro
                    ? "更多项目、更多协作空间、更高 API/MCP 限额，以及更强的项目曝光权益。"
                    : "完整参与社区与协作主链路，先把项目发出来、把队友找起来。"}
                </p>

                {tier === "free" ? (
                  <Link href="/signup" className={FREE_CTA_CLASS}>
                    免费开始
                  </Link>
                ) : (
                  <div className="mt-auto space-y-3">
                    <button className={PRIMARY_CTA_CLASS} onClick={() => void startCheckout(tier, "alipay")}>
                      使用支付宝升级
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className={ALT_BTN_CLASS} onClick={() => void startCheckout(tier, "wechatpay")}>
                        微信支付
                      </button>
                      <button className={ALT_BTN_CLASS} onClick={() => void startCheckout(tier, "stripe")}>
                        海外卡 / Stripe
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
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)] m-0">套餐对比</h3>
        </div>

        <div className={COMPARE_HEADER_CLASS}>
          <span>权益</span>
          <span className="text-center">Free</span>
          <span className="text-center">Pro</span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {FEATURE_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px] px-6 py-3 text-sm">
              <span className="text-[var(--color-text-secondary)] mb-2 md:mb-0">{row.label}</span>

              <div className="flex md:hidden justify-between text-xs font-mono mb-1">
                <span className="text-[var(--color-text-muted)]">Free</span>
                <span className="text-[var(--color-text-primary)]">{row.free === true ? "+" : row.free === false ? "-" : row.free}</span>
              </div>
              <div className="flex md:hidden justify-between text-xs font-mono">
                <span className="text-[var(--color-text-muted)]">Pro</span>
                <span className="text-[var(--color-text-primary)] font-bold">{row.pro === true ? "+" : row.pro === false ? "-" : row.pro}</span>
              </div>

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
