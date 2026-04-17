"use client";

import Link from "next/link";
import {
  FolderGit2,
  Bot,
  Sparkles,
} from "lucide-react";
import {
  Aurora,
  ShinyText,
  SplitText,
  Magnet,
} from "@/components/ui";
import { SearchBar } from "@/components/search-bar";

interface HomeHeroClientProps {
  primaryCTA: string;
  secondaryCTA: string;
  eyebrowText: string;
  heroLine1: string;
  heroLine2: string;
  heroDescription: string;
  primaryLabel: string;
  secondaryLabel: string;
}

/**
 * Client-side hero section with animated text and interactive effects.
 * Wraps server-rendered text through props to keep i18n on the server.
 */
export function HomeHeroClient({
  primaryCTA,
  secondaryCTA,
  eyebrowText,
  heroLine1,
  heroLine2,
  heroDescription,
  primaryLabel,
  secondaryLabel,
}: HomeHeroClientProps) {
  return (
    <section
      id="about"
      className="relative pt-14 pb-4 text-center scroll-mt-24"
    >
      {/* Aurora background */}
      <Aurora opacity={0.25} speed={0.8} />

      <div className="relative z-10 animate-fade-in-up">
        {/* Eyebrow with ShinyText */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
          <Sparkles className="w-3 h-3 text-[var(--color-accent-cyan)]" aria-hidden="true" />
          <ShinyText className="text-[11px] font-mono uppercase tracking-[0.12em]" speed={3}>
            {eyebrowText}
          </ShinyText>
        </div>

        {/* Hero titles with SplitText */}
        <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.06] mb-5 max-w-3xl mx-auto">
          <SplitText
            text={heroLine1}
            className="text-[var(--color-text-primary)]"
            delay={60}
          />
          <br />
          <SplitText
            text={heroLine2}
            className="text-[var(--color-text-secondary)]"
            delay={60}
          />
        </h1>

        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed mb-8">
          {heroDescription}
        </p>

        {/* CTA buttons with Magnet effect */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Magnet strength={6}>
            <Link
              href={primaryCTA}
              className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
            >
              <FolderGit2 className="w-4 h-4" aria-hidden="true" />
              {primaryLabel}
            </Link>
          </Magnet>
          <Magnet strength={6}>
            <Link
              href={secondaryCTA}
              className="btn btn-secondary px-6 py-2.5 text-sm font-semibold"
            >
              <Bot className="w-4 h-4" aria-hidden="true" />
              {secondaryLabel}
            </Link>
          </Magnet>
        </div>

        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
