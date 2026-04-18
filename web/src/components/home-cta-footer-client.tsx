"use client";

import Link from "next/link";
import {
  Clock,
  ArrowRight,
  Terminal,
} from "lucide-react";

interface HomeCtaFooterClientProps {
  eyebrowText: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryHref: string;
}

export function HomeCtaFooterClient({
  eyebrowText,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  primaryHref,
}: HomeCtaFooterClientProps) {
  return (
    <section className="card p-10 text-center border-t-2 border-t-[var(--color-accent-apple)] animate-fade-in-up delay-400">
      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-accent-apple)]">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {eyebrowText}
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">{title}</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-2 max-w-lg mx-auto m-0 leading-relaxed">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href={primaryHref} className="btn btn-primary px-7 py-2.5 text-sm font-semibold">
            {primaryLabel}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/developers"
            className="btn btn-ghost px-6 py-2.5 text-sm font-semibold"
          >
            <Terminal className="w-4 h-4" aria-hidden="true" />
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
