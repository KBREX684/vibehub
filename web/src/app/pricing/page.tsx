import { PricingCards } from "@/components/pricing-cards";
import { PricingPageHeader } from "@/components/pricing-page-header";
import { AnimatedSection } from "@/components/ui";
import { getServerTranslator } from "@/lib/i18n";

export default async function PricingPage() {
  const { t } = await getServerTranslator();
  const faqs = [
    "alipay",
    "plans",
    "renewal",
    "mcp",
    "enterprise",
  ] as const;

  return (
    <main className="container pb-24 pt-8 space-y-12">
      <PricingPageHeader />

      <PricingCards />

      <AnimatedSection as="section" style={{ maxWidth: 760, margin: "0 auto" }} className="space-y-5" delayMs={120}>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight m-0">
          {t("pricing.faq.title")}
        </h2>
        <div className="grid gap-3">
          {faqs.map((faqKey) => (
            <details key={faqKey} className="card group cursor-pointer overflow-hidden">
              <summary className="font-semibold text-sm text-[var(--color-text-primary)] p-4 select-none list-none flex items-center justify-between gap-2">
                {t(`pricing.faq.${faqKey}_q`)}
                <span className="text-[var(--color-text-muted)] text-xs group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out">
                <div className="overflow-hidden">
                  <p className="text-sm text-[var(--color-text-secondary)] px-4 pb-4 leading-relaxed">
                    {t(`pricing.faq.${faqKey}_a`)}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </AnimatedSection>
    </main>
  );
}
