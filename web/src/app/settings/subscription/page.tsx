import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserSubscription } from "@/lib/repository";
import { listBillingRecordsForUser } from "@/lib/repositories/billing.repository";
import { formatTierPrice, getLimits, resolveEntitledTier, TIER_PRICING } from "@/lib/subscription";
import { getPaymentProviderReadiness } from "@/lib/billing/provider-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Sparkles, Shield, ArrowRight, Receipt } from "lucide-react";

interface Props {
  searchParams: Promise<{ success?: string; portal?: string; provider?: string }>;
}

function formatDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("zh-CN");
}

function providerLabel(provider?: string) {
  if (provider === "alipay") return "支付宝";
  if (provider === "wechatpay") return "微信支付";
  if (provider === "stripe") return "Stripe";
  return "未绑定";
}

export default async function SubscriptionPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/settings/subscription");
  }

  const { success, portal, provider } = await searchParams;
  const [subscription, billingRecords] = await Promise.all([
    getUserSubscription(session.userId),
    listBillingRecordsForUser(session.userId, 10),
  ]);
  const effectiveTier = resolveEntitledTier(subscription);
  const limits = getLimits(effectiveTier);
  const pricing = TIER_PRICING[effectiveTier];
  const isPaid = effectiveTier === "pro";
  const statusLabel =
    subscription.status === "active"
      ? "有效"
      : subscription.status === "trialing"
        ? "试用中"
        : subscription.status === "past_due"
          ? "待处理"
          : "已取消";
  const activeProvider = isPaid ? (subscription.paymentProvider ?? "stripe") : undefined;
  const activeProviderReadiness = activeProvider ? getPaymentProviderReadiness(activeProvider) : null;
  const periodLabel = activeProvider && activeProvider !== "stripe" ? "当前权益截止" : subscription.cancelAtPeriodEnd ? "取消生效日" : "下次扣费日";

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <section className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">订阅与账单</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">查看当前套餐、支付渠道、权益额度和最近账单</p>
        </div>
      </section>

      {success === "1" ? (
        <div className="card p-4 border-[rgba(34,197,94,0.35)] bg-[var(--color-success-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-success)]">订阅状态已更新</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">支付成功后，新的额度和协作权益已经写回到当前账户。</p>
        </div>
      ) : null}

      {portal === "manual" ? (
        <div className="card p-4 border-[rgba(59,130,246,0.35)] bg-[var(--color-primary-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-primary-hover)]">当前渠道使用手动续费/人工处理</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {provider === "alipay"
              ? "支付宝按单次月付续期，不提供独立 portal。需要续费时重新发起一次结算。"
              : provider === "wechatpay"
                ? "微信支付按单次月付续期，不提供独立 portal。需要续费时重新发起一次结算。"
                : "当前没有可打开的自助账单管理入口。"}
          </p>
        </div>
      ) : null}

      <section className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">当前套餐</p>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{pricing.label}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{formatTierPrice(effectiveTier)}</p>
          </div>
          <span className={`tag ${subscription.status === "active" || subscription.status === "trialing" ? "tag-green" : "tag-red"}`}>{statusLabel}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxTeams === Infinity ? "∞" : limits.maxTeams}</p>
            <p className="text-xs text-[var(--color-text-muted)]">团队数</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxProjects === Infinity ? "∞" : limits.maxProjects}</p>
            <p className="text-xs text-[var(--color-text-muted)]">项目数</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxApiKeys === Infinity ? "∞" : limits.maxApiKeys}</p>
            <p className="text-xs text-[var(--color-text-muted)]">API Key 数</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.apiRatePerMinute.toLocaleString()}</p>
            <p className="text-xs text-[var(--color-text-muted)]">API 请求 / 分钟</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] m-0">支付渠道</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{providerLabel(activeProvider)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
              {activeProviderReadiness
                ? activeProviderReadiness.notes[0]
                : "免费用户无需绑定支付渠道。"}
            </p>
          </div>
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] m-0">{periodLabel}</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{formatDate(subscription.currentPeriodEnd) ?? "未开始计费"}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
              {activeProvider && activeProvider !== "stripe"
                ? "中国支付渠道当前按单次月付续期，不自动代扣。"
                : "Stripe 保留给海外银行卡支付与自助账单管理。"}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2 m-0">
            <Shield className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            企业认证与订阅解耦。企业认证仍是身份徽章审核，不是单独的企业工作台套餐。
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--color-primary-hover)]" />
          套餐操作
        </h3>
        <div className="flex flex-wrap gap-2">
          {effectiveTier === "free" ? (
            <Link href="/pricing" className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              升级到 Pro
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : activeProvider === "stripe" ? (
            <form action="/api/v1/billing/portal" method="POST">
              <button type="submit" className="btn btn-secondary text-sm px-4 py-2">
                管理 Stripe 账单 / 取消续费
              </button>
            </form>
          ) : (
            <form action="/api/v1/billing/portal" method="POST">
              <button type="submit" className="btn btn-secondary text-sm px-4 py-2">
                查看续费说明
              </button>
            </form>
          )}
          <Link href="/pricing" className="btn btn-ghost text-sm px-4 py-2">
            查看套餐对比
          </Link>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[var(--color-primary-hover)]" />
          最近账单
        </h3>
        {billingRecords.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] m-0">还没有账单记录。</p>
        ) : (
          <div className="space-y-3">
            {billingRecords.map((record) => {
              const isSandbox = record.metadata && typeof record.metadata === "object" && record.metadata.sandbox === true;
              return (
                <div key={record.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0 capitalize">
                        {providerLabel(record.paymentProvider)} · {record.status}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">
                        {(record.amountCents / 100).toFixed(2)} {record.currency} · {new Date(record.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    {isSandbox ? (
                      <Link href={`/checkout/sandbox?record=${encodeURIComponent(record.id)}`} className="btn btn-ghost text-xs px-3 py-1.5">
                        打开沙箱
                      </Link>
                    ) : null}
                  </div>
                  {record.description ? (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">{record.description}</p>
                  ) : null}
                  {record.failureReason ? (
                    <p className="text-xs text-[var(--color-danger)] mt-2 mb-0">{record.failureReason}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
