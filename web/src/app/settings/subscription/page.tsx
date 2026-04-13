import { SiteHeader } from "@/components/site-header";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserSubscription } from "@/lib/repository";
import { getLimits, TIER_PRICING } from "@/lib/subscription";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ success?: string }>;
}

export default async function SubscriptionPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/api/v1/auth/github?redirect=/settings/subscription");
  }

  const { success } = await searchParams;
  const subscription = await getUserSubscription(session.userId);
  const limits = getLimits(subscription.tier);
  const pricing = TIER_PRICING[subscription.tier];

  const isActive = subscription.status === "active" || subscription.status === "trialing";

  return (
    <>
      <SiteHeader />
      <main className="container">
        <section className="section" style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1>订阅管理</h1>

          {success === "1" ? (
            <div className="card" style={{ background: "#f0fdf4", borderColor: "#86efac", marginBottom: 16 }}>
              <strong style={{ color: "#15803d" }}>🎉 订阅成功！</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>您的账户已升级，所有新功能现在可以使用。</p>
            </div>
          ) : null}

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="meta-row">
              <h2 style={{ margin: 0 }}>当前方案：{pricing.label}</h2>
              <span className={`status ${isActive ? "status-approved" : "status-rejected"}`}>
                {subscription.status === "active" ? "活跃" :
                 subscription.status === "trialing" ? "试用中" :
                 subscription.status === "past_due" ? "付款逾期" : "已取消"}
              </span>
            </div>

            {subscription.currentPeriodEnd ? (
              <p className="muted small">
                {subscription.cancelAtPeriodEnd ? "取消生效时间：" : "下次续费："}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("zh-CN")}
              </p>
            ) : null}

            <div className="funnel-grid" style={{ marginTop: 16 }}>
              <div className="funnel-stat">
                <strong>{limits.maxTeams === Infinity ? "∞" : limits.maxTeams}</strong>
                <span>团队上限</span>
              </div>
              <div className="funnel-stat">
                <strong>{limits.maxProjects === Infinity ? "∞" : limits.maxProjects}</strong>
                <span>项目上限</span>
              </div>
              <div className="funnel-stat">
                <strong>{limits.maxScreenshots === Infinity ? "∞" : limits.maxScreenshots}</strong>
                <span>截图上限</span>
              </div>
              <div className="funnel-stat">
                <strong>{limits.apiRatePerMinute.toLocaleString()}</strong>
                <span>API 次/分钟</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {subscription.tier === "free" ? (
              <Link href="/pricing" className="button" style={{ background: "var(--brand)", color: "#fff", border: "none" }}>
                升级方案
              </Link>
            ) : (
              <form action="/api/v1/billing/portal" method="POST">
                <button type="submit" className="button ghost">
                  管理订阅 / 取消
                </button>
              </form>
            )}
            <Link href="/pricing" className="button ghost">查看方案对比</Link>
          </div>
        </section>
      </main>
    </>
  );
}
