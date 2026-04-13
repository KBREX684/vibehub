import { SiteHeader } from "@/components/site-header";
import { PricingCards } from "@/components/pricing-cards";

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <section className="section" style={{ textAlign: "center" }}>
          <h1 style={{ marginBottom: 8 }}>简单透明的定价</h1>
          <p className="muted">免费用户完整体验社区广场；付费用户解锁更多空间和曝光。</p>
        </section>

        <PricingCards />

        <section className="section" style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2>常见问题</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              { q: "可以随时取消订阅吗？", a: "可以。取消后订阅继续到当前计费周期结束，之后自动降级为 Free。" },
              { q: "支持哪些支付方式？", a: "通过 Stripe 支持信用卡/借记卡。微信/支付宝支持正在接入中。" },
              { q: "团队成员也需要付费吗？", a: "不需要。只有团队创建者需要订阅，成员加入不收费。" },
              { q: "免费版有功能限制吗？", a: "免费版可完整使用社区广场（浏览、发帖、评论、点赞、关注）。付费版解锁更多团队空间、项目数量和曝光机会。" },
            ].map(({ q, a }) => (
              <details key={q} className="card" style={{ cursor: "pointer" }}>
                <summary style={{ fontWeight: 600, padding: "4px 0" }}>{q}</summary>
                <p className="muted" style={{ marginTop: 8 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
