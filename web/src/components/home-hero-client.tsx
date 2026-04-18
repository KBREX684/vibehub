"use client";

import Link from "next/link";
import { FolderGit2, Bot, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { ShinyHeroLine } from "@/components/visual/shiny-hero-line";

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
 * Client-side hero content only.
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
    <div className="relative z-10 animate-fade-in-up">
      <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)]/80 border border-[var(--color-border)] backdrop-blur-sm">
        <Sparkles className="w-3 h-3 text-[var(--color-accent-cyan)]" aria-hidden="true" />
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          {eyebrowText}
        </span>
      </div>

      <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.06] mb-5 max-w-3xl mx-auto">
        <span className="text-[var(--color-text-primary)]">{heroLine1}</span>
        <br />
        <ShinyHeroLine text={heroLine2} className="mt-1 text-[var(--color-text-secondary)]" />
      </h1>

      <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed mb-8">
        {heroDescription}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
        <Link href={primaryCTA} className="btn btn-primary px-6 py-2.5 text-sm font-semibold">
          <FolderGit2 className="w-4 h-4" aria-hidden="true" />
          {primaryLabel}
        </Link>
        <Link href={secondaryCTA} className="btn btn-secondary px-6 py-2.5 text-sm font-semibold">
          <Bot className="w-4 h-4" aria-hidden="true" />
          {secondaryLabel}
        </Link>
      </div>

      <div className="max-w-xl mx-auto">
        <SearchBar />
      </div>
    </div>
  );
}
