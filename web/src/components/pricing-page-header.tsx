"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { AnimatedSection, GradientText } from "@/components/ui";

export function PricingPageHeader() {
  const { t } = useLanguage();

  return (
    <AnimatedSection as="section" className="text-center pt-6">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
        <GradientText animate speed={5}>
          {t("pricing.header.title")}
        </GradientText>
      </h1>
      <p className="text-base text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
        {t("pricing.header.description")}
      </p>
    </AnimatedSection>
  );
}
