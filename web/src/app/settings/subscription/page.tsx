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
  if (provider === "alipay") return t("pricing.provider_alipay", "Alipay");
  return t("subscription.provider_unlinked", "Not linked");
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
      ? t("subscription.status_active", "Active")
      : subscription.status === "trialing"
        ? t("subscription.status_trialing", "Trialing")
        : subscription.status === "past_due"
          ? t("subscription.status_past_due", "Past due")
          : t("subscription.status_canceled", "Canceled");
  // v10/v11: payment is China-only (Alipay), manual-renewal model.
  const activeProvider = isPaid ? (subscription.paymentProvider ?? "alipay") : undefined;
  const activeProviderReadiness = activeProvider ? getPaymentProviderReadiness(activeProvider) : null;
  const periodLabel = activeProvider
    ? t("subscription.current_period_end", "Current access ends")
    : subscription.cancelAtPeriodEnd
      ? t("subscription.cancel_effective", "Cancellation effective on")
      : t("subscription.next_billing_date", "Next billing date");

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <section className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t("subscription.title", "Subscription & billing")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{t("subscription.subtitle", "Review your current plan, payment channel, usage limits, and recent billing history.")}</p>
        </div>
      </section>

      {success === "1" ? (
        <div className="card p-4 border-[var(--color-border-strong)] bg-[var(--color-success-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-success)]">{t("subscription.updated_title", "Subscription updated")}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t("subscription.updated_body", "Your new limits and collaboration entitlements are now active on this account.")}</p>
        </div>
      ) : null}

      {portal === "manual" ? (
        <div className="card p-4 border-[var(--color-border-strong)] bg-[var(--color-primary-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-primary-hover)]">{t("subscription.manual_title", "This payment channel uses manual renewal")}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {provider === "alipay"
              ? t("subscription.manual_alipay", "Alipay renews on a one-time monthly checkout and does not provide a separate billing portal. Start a new checkout when you need to renew.")
              : t("subscription.manual_fallback", "There is no self-serve billing portal for the current provider.")}
          </p>
        </div>
      ) : null}

      <section className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{t("subscription.current_plan", "Current plan")}</p>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{pricing.label}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{formatTierPrice(effectiveTier, language)}</p>
          </div>
          <Badge variant={subscription.status === "active" || subscription.status === "trialing" ? "success" : "error"} pill mono size="sm">
            {statusLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxStorageGb === Infinity ? "∞" : `${limits.maxStorageGb} GB`}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_storage", "存储")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxLedgerPerMonth === Infinity ? "∞" : limits.maxLedgerPerMonth}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_ledger", "Ledger/月")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxApiKeys === Infinity ? "∞" : limits.maxApiKeys}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_api_keys", "API keys")}</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{formatLocalizedNumber(limits.apiRatePerMinute, language)}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t("subscription.limit_rate", "API requests / minute")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] m-0">{t("subscription.provider", "Payment provider")}</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{providerLabel(activeProvider, t)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
              {activeProviderReadiness
                ? activeProviderReadiness.notes[0]
                : t("subscription.free_provider_note", "Free users do not need a linked payment provider.")}
            </p>
          </div>
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] m-0">{periodLabel}</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{subscription.currentPeriodEnd ? formatLocalizedDate(subscription.currentPeriodEnd, language) : t("subscription.not_started", "Not started yet")}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
              {activeProvider
                ? t("subscription.cn_renewal_note", "China payment providers currently renew through one-time monthly checkout rather than automatic recurring billing.")
                : t("subscription.free_renewal_note", "Free tier does not renew. Upgrade to Pro for monthly entitlements.")}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2 m-0">
            <Shield className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            {t("subscription.enterprise_note", "Enterprise verification is separate from billing. It remains an identity badge review process rather than a standalone workspace plan.")}
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--color-primary-hover)]" />
          {t("subscription.actions", "Plan actions")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {effectiveTier === "free" ? (
            <Link href="/pricing" className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              {t("subscription.upgrade_to_pro", "Upgrade to Pro")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <form action="/api/v1/billing/portal" method="POST">
              <button type="submit" className="btn btn-secondary text-sm px-4 py-2">
                {t("subscription.view_renewal_guide", "View renewal guide")}
              </button>
            </form>
          )}
          <Link href="/pricing" className="btn btn-ghost text-sm px-4 py-2">
            {t("subscription.compare_plans", "Compare plans")}
          </Link>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[var(--color-primary-hover)]" />
          {t("subscription.recent_billing", "Recent billing")}
        </h3>
        {billingRecords.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] m-0">{t("subscription.no_billing", "No billing records yet.")}</p>
        ) : (
          <div className="space-y-3">
            {billingRecords.map((record) => {
              const isSandbox = record.metadata && typeof record.metadata === "object" && record.metadata.sandbox === true;
              return (
                <div key={record.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0 capitalize">
                        {providerLabel(record.paymentProvider, t)} · {record.status}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">
                        {(record.amountCents / 100).toFixed(2)} {record.currency} · {formatLocalizedDateTime(record.createdAt, language)}
                      </p>
                    </div>
                    {isSandbox ? (
                      <Link href={`/checkout/sandbox?record=${encodeURIComponent(record.id)}`} className="btn btn-ghost text-xs px-3 py-1.5">
                        {t("subscription.open_sandbox", "Open sandbox")}
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
