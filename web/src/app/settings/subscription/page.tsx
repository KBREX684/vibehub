import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserSubscription } from "@/lib/repository";
import { listBillingRecordsForUser } from "@/lib/repositories/billing.repository";
import { getLimits, TIER_PRICING } from "@/lib/subscription";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Sparkles, Shield, ArrowRight } from "lucide-react";

interface Props {
  searchParams: Promise<{ success?: string; portal?: string }>;
}

export default async function SubscriptionPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/settings/subscription");
  }

  const { success, portal } = await searchParams;
  const [subscription, billingRecords] = await Promise.all([
    getUserSubscription(session.userId),
    listBillingRecordsForUser(session.userId, 10),
  ]);
  const limits = getLimits(subscription.tier);
  const pricing = TIER_PRICING[subscription.tier];

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const statusLabel =
    subscription.status === "active"
      ? "Active"
      : subscription.status === "trialing"
        ? "Trialing"
        : subscription.status === "past_due"
          ? "Past due"
          : "Canceled";

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <section className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Subscription</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage plan, billing status, and usage limits</p>
        </div>
      </section>

      {success === "1" ? (
        <div className="card p-4 border-[rgba(34,197,94,0.35)] bg-[var(--color-success-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-success)]">Plan upgraded successfully</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Your account now has access to the new subscription capabilities.
          </p>
        </div>
      ) : null}

      {portal === "manual" ? (
        <div className="card p-4 border-[rgba(59,130,246,0.35)] bg-[var(--color-primary-subtle)]">
          <p className="text-sm font-semibold text-[var(--color-primary-hover)]">Manual billing management</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            China payment staging records are managed from the sandbox flow until live merchant portals are wired.
          </p>
        </div>
      ) : null}

      <section className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Current plan</p>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{pricing.label}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{pricing.priceMonthly === 0 ? "Free" : `$${pricing.priceMonthly}/month`}</p>
          </div>
          <span className={`tag ${isActive ? "tag-green" : "tag-red"}`}>{statusLabel}</span>
        </div>

        {subscription.currentPeriodEnd ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            {subscription.cancelAtPeriodEnd ? "Cancellation effective:" : "Next billing date:"}{" "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US")}
          </p>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxTeams === Infinity ? "∞" : limits.maxTeams}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Team limit</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxProjects === Infinity ? "∞" : limits.maxProjects}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Project limit</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.maxScreenshots === Infinity ? "∞" : limits.maxScreenshots}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Screenshot limit</p>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{limits.apiRatePerMinute.toLocaleString()}</p>
            <p className="text-xs text-[var(--color-text-muted)]">API req/min</p>
          </div>
        </div>

        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            Enterprise verification status is managed separately in the enterprise workflow.
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--color-primary-hover)]" />
          Plan actions
        </h3>
        <div className="flex flex-wrap gap-2">
          {subscription.tier === "free" ? (
            <Link href="/pricing" className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              Upgrade plan
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <form action="/api/v1/billing/portal" method="POST">
              <button type="submit" className="btn btn-secondary text-sm px-4 py-2">
                Manage billing / cancel
              </button>
            </form>
          )}
          <Link href="/pricing" className="btn btn-ghost text-sm px-4 py-2">
            Compare plans
          </Link>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Billing history</h3>
        {billingRecords.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] m-0">No billing records yet.</p>
        ) : (
          <div className="space-y-3">
            {billingRecords.map((record) => (
              <div key={record.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0 capitalize">
                      {record.paymentProvider} · {record.status}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">
                      {(record.amountCents / 100).toFixed(2)} {record.currency} · {new Date(record.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {record.paymentProvider !== "stripe" ? (
                    <Link href={`/checkout/sandbox?record=${encodeURIComponent(record.id)}`} className="btn btn-ghost text-xs px-3 py-1.5">
                      Open sandbox
                    </Link>
                  ) : null}
                </div>
                {record.failureReason ? (
                  <p className="text-xs text-[var(--color-danger)] mt-2 mb-0">{record.failureReason}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
