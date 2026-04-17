"use client";

import Link from "next/link";
import { Zap, Globe, Link2 } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

type FooterLink =
  | { kind: "link"; href: string; labelKey: string }
  | { kind: "mailto"; href: string; labelKey: string }
  | { kind: "soon"; labelKey: string };

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
        { kind: "link", href: "/discover", labelKey: "nav.discover" },
        { kind: "link", href: "/discussions", labelKey: "nav.discussions" },
        { kind: "link", href: "/teams", labelKey: "nav.teams" },
        { kind: "link", href: "/leaderboards", labelKey: "nav.leaderboards" },
      ],
    },
    {
      titleKey: "footer.developers",
      links: [
        { kind: "link", href: "/settings/api-keys", labelKey: "footer.apiKeys" },
        { kind: "link", href: "/api/v1/openapi.json", labelKey: "footer.openapi" },
        { kind: "link", href: "/pricing", labelKey: "footer.pricing" },
      ],
    },
    {
      titleKey: "footer.company",
      links: [
        { kind: "link", href: "/#about", labelKey: "footer.about" },
        { kind: "soon", labelKey: "footer.blog" },
        { kind: "soon", labelKey: "footer.careers" },
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
              <span className="w-6 h-6 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[var(--color-text-inverse)]" />
              </span>
              VibeHub
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: Link2, href: "https://github.com", labelKey: "footer.github" },
                { icon: Link2, href: "https://twitter.com", labelKey: "footer.twitter" },
                { icon: Globe, href: "/", labelKey: "footer.website" },
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
                  if (link.kind === "soon") {
                    const label = `${t(link.labelKey)} (${t("common.comingSoon")})`;
                    return (
                      <li key={link.labelKey}>
                        <span className="text-sm text-[var(--color-text-muted)] cursor-default">{label}</span>
                      </li>
                    );
                  }
                  if (link.kind === "mailto") {
                    return (
                      <li key={link.labelKey}>
                        <a
                          href={link.href}
                          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
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
                        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
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
            ].map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
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
