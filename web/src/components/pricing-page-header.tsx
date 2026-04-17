"use client";

import { GradientText } from "@/components/ui";

export function PricingPageHeader() {
  return (
    <section className="text-center pt-6 animate-fade-in-up">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
        <GradientText animate speed={5}>
          中国优先的透明定价
        </GradientText>
      </h1>
      <p className="text-base text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
        免费注册即可完整参与社区。Pro 月付 ¥29，重点提升协作空间、项目曝光与开发者额度。
      </p>
    </section>
  );
}
