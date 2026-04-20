"use client";

import { useLanguage } from "@/app/context/LanguageContext";

export function PricingPageHeader() {
  const { t } = useLanguage();

  return (
    <section className="text-center pt-20 pb-12">
      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] mb-3">
        VibeHub Pricing
      </p>
      <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] text-[var(--color-text-primary)] mb-4">
        定价
      </h1>
      <p className="text-base text-[var(--color-text-secondary)] max-w-[560px] mx-auto leading-[1.75]">
        v11 专注独立开发者。只有 Free 与 Pro 两档。
        不做团队套餐，不做企业套餐。
      </p>
    </section>
  );
}
