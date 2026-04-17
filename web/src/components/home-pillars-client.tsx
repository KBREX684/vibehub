"use client";

import Link from "next/link";
import {
  ArrowRight,
  MessagesSquare,
  FolderGit2,
  Users,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SpotlightCard } from "@/components/ui";

const ICONS: Record<string, LucideIcon> = {
  MessagesSquare,
  FolderGit2,
  Users,
  Bot,
};

const ACCENT_CLASS: Record<string, string> = {
  cyan: "text-[var(--color-accent-cyan)]",
  apple: "text-[var(--color-accent-apple)]",
  violet: "text-[var(--color-accent-violet)]",
  success: "text-[var(--color-success)]",
};

export interface PillarItem {
  icon: string;
  href: string;
  title: string;
  desc: string;
  accent: string;
}

export function HomePillarsClient({ pillars }: { pillars: PillarItem[] }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up delay-100">
      {pillars.map(({ icon, href, title, desc, accent }) => {
        const Icon = ICONS[icon] ?? Bot;
        const accentClass = ACCENT_CLASS[accent] ?? ACCENT_CLASS.cyan;
        return (
          <Link key={title} href={href} className="block">
            <SpotlightCard
              className="card p-5 group flex flex-col gap-3 h-full"
              spotlightColor={
                accent === "cyan"
                  ? "rgba(34,211,238,0.08)"
                  : accent === "apple"
                    ? "rgba(0,113,227,0.08)"
                    : accent === "violet"
                      ? "rgba(167,139,250,0.08)"
                      : "rgba(52,211,153,0.08)"
              }
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${accentClass}`} aria-hidden="true" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
                {title}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed m-0">
                {desc}
              </p>
            </SpotlightCard>
          </Link>
        );
      })}
    </section>
  );
}
