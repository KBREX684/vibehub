import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserSubscription } from "@/lib/repository";
import { listBillingRecordsForUser } from "@/lib/repositories/billing.repository";
import { formatTierPrice, getLimits, resolveEntitledTier, TIER_PRICING } from "@/lib/subscription";
import { getPaymentProviderReadiness } from "@/lib/billing/provider-config";
import { Badge } from "@/components/ui";
import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from "@/lib/formatting";
import { getServerLanguage, getServerTranslator } from "@/lib/i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Sparkles, Shield, ArrowRight, Receipt } from "lucide-react";

interface Props {
  searchParams: Promise<{ success?: string; portal?: string; provider?: string }>;
}

function providerLabel(provider: string | undefined, t: (key: string, fallback?: string) => string) {
  if (provider === "alipay") return t("pricing.provider_alipay", "支付宝");
  return t("subscription.provider_unlinked", "未绑定");
}

function billingStatusLabel(status: string) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失败";
  if (status === "canceled") return "已取消";
  if (status === "refunded") return "已退款";
  return "待处理";
}

function formatLimitBytes(bytes: number, language: string) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${formatLocalizedNumber(Number((bytes / (1024 * 1024 * 1024)).toFixed(1)), language)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${formatLocalizedNumber(Number((bytes / (1024 * 1024)).toFixed(1)), language)} MB`;
  }
  if (bytes >= 1024) {
    return `${formatLocalizedNumber(Number((bytes / 1024).toFixed(1)), language)} KB`;
  }
  return `${formatLocalizedNumber(bytes, language)} B`;
}

export default async function SubscriptionPage({ searchParams }: Props) {
  const [{ t }, language] = await Promise.all([getServerTranslator(), getServerLanguage()]);
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
      ? t("subscription.status_active", "生效中")
      : subscription.status === "trialing"
        ? t("subscription.status_trialing", "试用中")
        : subscription.status === "past_due"
          ? t("subscription.status_past_due", "待处理")
          : t("subscription.status_canceled", "已取消");
  const activeProvider = isPaid ? (subscription.paymentProvider ?? "alipay") : undefined;
  const activeProviderReadiness = activeProvider ? getPaymentProviderReadiness(activeProvider) : null;
  const periodLabel = t("subscription.current_period_end", "当前权益结束时间");

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <section className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t("subscription.title", "订阅与计费")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{t("subscription.subtitle", "查看当前套餐、支付渠道、使用额度和最近账单记录。")}</p>
        </div>
      </section>

      {success === "1" ? (
        <div className="card p-4 border-[var(--color-border-strong)] bg-[var(--color-success-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-success)]">{t("subscription.updated_title", "订阅已更新")}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t("subscription.updated_body", "新的额度与协作权益已经在当前账号生效。")}</p>
        </div>
      ) : null}

      {portal === "manual" ? (
        <div className="card p-4 border-[var(--color-border-strong)] bg-[var(--color-primary-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-primary-hover)]">{t("subscription.manual_title", "当前支付渠道采用手动续费")}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {provider === "alipay"
              ? t("subscription.manual_alipay", "支付宝采用按次月度续费，不提供独立账单门户。需要续费时请重新发起支付。")
              : t("subscription.manual_fallback", "当前支付渠道不提供自助账单门户。")}
          </p>
        </div>
      ) : null}

      <section className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{t("subscription.current_plan", "当前套餐")}</p>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{pricing.label}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{formatTierPrice(effectiveTier, language)}</p>
          </div>
          <Badge variant={subscription.status === "active" || subscription.status === "trialing" ? "success" : "error"} pill mono size="sm">
            {statusLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxTeams === Infinity ? "∞" : limits.maxTeams}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_teams", "团队数")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxProjects === Infinity ? "∞" : limits.maxProjects}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_projects", "项目数")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxApiKeys === Infinity ? "∞" : limits.maxApiKeys}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_api_keys", "API 密钥")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{formatLocalizedNumber(limits.apiRatePerMinute, language)}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_rate", "每分钟 API 请求数")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{formatLimitBytes(limits.workspaceStorageMb * 1024 * 1024, language)}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_workspace_storage", "工作区存储")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{formatLimitBytes(limits.maxWorkspaceFileBytes, language)}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_workspace_file", "单文件上传上限")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] m-0">{t("subscription.provider", "支付渠道")}</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{providerLabel(activeProvider, t)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
              {activeProviderReadiness
                ? activeProviderReadiness.notes[0]
                : t("subscription.free_provider_note", "免费版用户无需绑定支付渠道。")}
            </p>
          </div>
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] m-0">{periodLabel}</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{subscription.currentPeriodEnd ? formatLocalizedDate(subscription.currentPeriodEnd, language) : t("subscription.not_started", "尚未开始")}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
              {t("subscription.cn_renewal_note", "当前中国版支付采用按次月度续费，而不是自动循环扣费。")}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2 m-0">
            <Shield className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            {t("subscription.enterprise_note", "企业认证与订阅计费分离，当前仍是身份徽章审核流程，而不是独立套餐。")}
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--color-primary-hover)]" />
          {t("subscription.actions", "套餐操作")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {effectiveTier === "free" ? (
            <Link href="/pricing" className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              {t("subscription.upgrade_to_pro", "升级到专业版")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link href="/settings/subscription?portal=manual&provider=alipay" className="btn btn-secondary text-sm px-4 py-2">
              {t("subscription.view_renewal_guide", "查看续费说明")}
            </Link>
          )}
          <Link href="/pricing" className="btn btn-ghost text-sm px-4 py-2">
            {t("subscription.compare_plans", "查看套餐对比")}
          </Link>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[var(--color-primary-hover)]" />
          {t("subscription.recent_billing", "最近账单")}
        </h3>
        {billingRecords.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] m-0">{t("subscription.no_billing", "暂无账单记录。")}</p>
        ) : (
          <div className="space-y-3">
            {billingRecords.map((record) => {
              const isSandbox = record.metadata && typeof record.metadata === "object" && record.metadata.sandbox === true;
              return (
                <div key={record.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0 capitalize">
                        {providerLabel(record.paymentProvider, t)} · {billingStatusLabel(record.status)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">
                        {(record.amountCents / 100).toFixed(2)} {record.currency} · {formatLocalizedDateTime(record.createdAt, language)}
                      </p>
                    </div>
                    {isSandbox ? (
                      <Link href={`/checkout/sandbox?record=${encodeURIComponent(record.id)}`} className="btn btn-ghost text-xs px-3 py-1.5">
                        {t("subscription.open_sandbox", "打开沙箱页")}
                      </Link>
                    ) : null}
                  </div>
                  {record.description ? (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">{record.description}</p>
                  ) : null}
                  {record.failureReason ? (
                    <p className="text-xs text-[var(--color-error)] mt-2 mb-0">{record.failureReason}</p>
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
