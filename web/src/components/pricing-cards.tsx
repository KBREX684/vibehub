"use client";

import Link from "next/link";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";

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
        alert(json.error?.message ?? "无法启动支付，请稍后再试。");
      }
    } catch {
      alert("网络错误，请稍后再试。");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 40 }}>
      {TIERS.map((tier) => {
        const pricing = TIER_PRICING[tier];
        const limits = TIER_LIMITS[tier];
        return (
          <div key={tier} className={`tier-card ${tier === "pro" ? "tier-current" : ""}`}>
            <div>
              <h2 style={{ margin: 0 }}>{pricing.label}</h2>
              {tier === "pro" && <span className="tag" style={{ background: "#dbeafe", color: "#1e40af" }}>最受欢迎</span>}
              <div className="tier-price">
                {pricing.priceMonthly === 0 ? "免费" : (
                  <><sup>¥</sup>{pricing.priceMonthly}<span style={{ fontSize: "0.9rem", fontWeight: 400 }}>/月</span></>
                )}
              </div>
            </div>
            <ul className="tier-features">
              <li>最多 {limits.maxTeams === Infinity ? "无限" : limits.maxTeams} 个团队</li>
              <li>每团队 {limits.maxTeamMembers === Infinity ? "无限" : limits.maxTeamMembers} 名成员</li>
              <li>最多 {limits.maxProjects === Infinity ? "无限" : limits.maxProjects} 个项目</li>
              <li>每项目 {limits.maxScreenshots === Infinity ? "无限" : limits.maxScreenshots} 张截图</li>
              <li>API {limits.apiRatePerMinute.toLocaleString()} 次/分钟</li>
              <li>{limits.canFeatureProject ? "每日展示位申请" : "—"}</li>
              <li>{limits.canPublishMilestone ? "里程碑公开展示" : "—"}</li>
              <li>{limits.mcpToolsUnlocked ? "全部 MCP 工具" : "基础 5 个工具"}</li>
            </ul>
            {tier === "free" ? (
              <Link href="/api/v1/auth/github?redirect=/" className="button ghost" style={{ textAlign: "center" }}>
                GitHub 免费登录
              </Link>
            ) : (
              <button
                className="button"
                style={{ background: "var(--brand)", color: "#fff", border: "none" }}
                onClick={() => void startCheckout(tier)}
              >
                升级到 {pricing.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
