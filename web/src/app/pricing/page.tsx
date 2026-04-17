import { PricingCards } from "@/components/pricing-cards";
import { PricingPageHeader } from "@/components/pricing-page-header";
import { AnimatedSection, BlurText } from "@/components/ui";

export default function PricingPage() {
  return (
    <main className="container pb-24 pt-8 space-y-12">
      <PricingPageHeader />

      <PricingCards />

      <AnimatedSection as="section" style={{ maxWidth: 760, margin: "0 auto" }} className="space-y-5" delayMs={120}>
        <BlurText as="h2" className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
          常见问题
        </BlurText>
        <div className="grid gap-3">
          {[
            {
              q: "支付宝和微信支付现在是什么状态？",
              a: "支付宝是中国市场的主推结算入口，微信支付并行接入。没有正式商户配置时，系统会明确提示未配置，而不是伪造成功支付。",
            },
            {
              q: "Stripe 还保留吗？",
              a: "保留。Stripe 主要作为海外银行卡支付和自助账单管理通道，不再作为中国用户的默认结算路径。",
            },
            {
              q: "为什么当前只有 Free 和 Pro？",
              a: "当前 GA 以个人开发者和小团队协作为主，正式商用档位先收敛到 Free / Pro。Team 套餐放到后续商业化阶段，不在本轮上线门槛内。",
            },
            {
              q: "中国支付是自动续费吗？",
              a: "当前中国支付按单次月付续期，不默认自动代扣。到期前可再次发起续费。Stripe 保留自动续费与账单 portal 能力。",
            },
            {
              q: "MCP Developer Access 现在能直接开通吗？",
              a: "还没有对所有用户全面开放。本轮只保留申请制和能力说明，不把它作为当前个人订阅流程的一部分。",
            },
            {
              q: "企业用户怎么使用？",
              a: "企业用户仍然通过普通账号使用产品。企业认证是身份徽章审核，不是独立企业工作台套餐。",
            },
          ].map(({ q, a }) => (
            <details key={q} className="card group cursor-pointer overflow-hidden">
              <summary className="font-semibold text-sm text-[var(--color-text-primary)] p-4 select-none list-none flex items-center justify-between gap-2">
                {q}
                <span className="text-[var(--color-text-muted)] text-xs group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out">
                <div className="overflow-hidden">
                  <p className="text-sm text-[var(--color-text-secondary)] px-4 pb-4 leading-relaxed">{a}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </AnimatedSection>
    </main>
  );
}
