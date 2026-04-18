"use client";

import Link from "next/link";
import { Zap, BookOpen, GitBranch, Mail } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { Float } from "@/components/ui";

type FooterLink =
  | { kind: "link"; href: string; labelKey: string }
  | { kind: "mailto"; href: string; labelKey: string };

type FooterColumn = {
  titleKey: string;
  links: FooterLink[];
};

export function Footer() {
  const { t } = useLanguage();
  const columns: FooterColumn[] = [
    {
      titleKey: "footer.platform",
      links: [
        { kind: "link", href: "/discover", labelKey: "nav.projects" },
        { kind: "link", href: "/discussions", labelKey: "nav.discussions" },
        { kind: "link", href: "/teams", labelKey: "nav.teams" },
        { kind: "link", href: "/pricing", labelKey: "nav.pricing" },
      ],
    },
    {
      titleKey: "footer.developers",
      links: [
        { kind: "link", href: "/developers", labelKey: "nav.developers" },
        { kind: "link", href: "/settings/api-keys", labelKey: "footer.apiKeys" },
        { kind: "link", href: "/api/v1/openapi.json", labelKey: "footer.openapi" },
        { kind: "link", href: "/developers/api-docs", labelKey: "footer.docs" },
      ],
    },
    {
      titleKey: "footer.company",
      links: [
        { kind: "link", href: "/#about", labelKey: "footer.about" },
        { kind: "link", href: "/rules", labelKey: "footer.rules" },
        { kind: "link", href: "/aigc", labelKey: "footer.aigc" },
        { kind: "mailto", href: "mailto:support@vibehub.dev", labelKey: "footer.contact" },
      ],
    },
  ];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)] mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand col */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-base text-[var(--color-text-primary)] mb-3">
              <Float distance={4} speed={4}>
                <span className="w-6 h-6 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] flex items-center justify-center shadow-[inset_0_1px_0_var(--color-featured-highlight)]">
                  <Zap className="w-3.5 h-3.5 text-[var(--color-text-primary)]" />
                </span>
              </Float>
              VibeHub
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: GitBranch, href: "https://github.com/KBREX684/vibehub", labelKey: "footer.github" },
                { icon: BookOpen, href: "/developers", labelKey: "footer.docs" },
                { icon: Mail, href: "mailto:support@vibehub.dev", labelKey: "footer.contact" },
              ].map(({ icon: Icon, href, labelKey }) => (
                <a
                  key={labelKey}
                  href={href}
                  className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
                  aria-label={t(labelKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.titleKey}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                {t(col.titleKey)}
              </h4>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => {
                  if (link.kind === "mailto") {
                    return (
                      <li key={link.labelKey}>
                        <a
                          href={link.href}
                          className="footer-link text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          {t(link.labelKey)}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="footer-link text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        {t(link.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} VibeHub. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4">
            {[
              { href: "/privacy", key: "footer.privacy" },
              { href: "/terms", key: "footer.terms" },
              { href: "/rules", key: "footer.rules" },
              { href: "/aigc", key: "footer.aigc" },
            ].map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="footer-link text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {t(item.key)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
