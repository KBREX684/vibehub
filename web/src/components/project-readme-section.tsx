"use client";

import { useState } from "react";
import { MarkdownDocument } from "@/components/markdown-document";
import { useLanguage } from "@/app/context/LanguageContext";

export function ProjectReadmeSection({
  description,
  readmeMarkdown,
}: {
  description: string;
  readmeMarkdown?: string;
}) {
  const { t } = useLanguage();
  const hasReadme = Boolean(readmeMarkdown?.trim());
  const [tab, setTab] = useState<"overview" | "readme">("overview");

  if (!hasReadme) {
    return (
      <section className="card p-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">About the Project</h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
          {description}
        </p>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <div
        className="flex flex-wrap gap-2 mb-4 border-b border-[var(--color-border-subtle)] pb-3"
        role="tablist"
        aria-label="Project documentation"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          className={`text-sm font-medium px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
            tab === "overview"
              ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
          onClick={() => setTab("overview")}
        >
          {t("project.overview_tab", "Overview")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "readme"}
          className={`text-sm font-medium px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
            tab === "readme"
              ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
          onClick={() => setTab("readme")}
        >
          {t("project.readme_tab", "README")}
        </button>
      </div>
      {tab === "overview" ? (
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap m-0">
          {description}
        </p>
      ) : (
        <MarkdownDocument markdown={readmeMarkdown ?? ""} />
      )}
    </section>
  );
}
