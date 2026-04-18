"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { AnimatedSection } from "@/components/ui";

export function PricingPageHeader() {
  const { t } = useLanguage();

  return (
    <AnimatedSection as="section" className="text-center pt-6">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3">{t("pricing.header.title")}</h1>
      <p className="text-base text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
        {t("pricing.header.description")}
      </p>
    </AnimatedSection>
  );
}
