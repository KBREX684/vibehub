"use client";

import Link from "next/link";
import { Zap, BookOpen, GitBranch, Mail } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { Float } from "@/components/ui";

type FooterLink =
  | { kind: "link"; href: string; labelKey: string; fallback: string }
  | { kind: "mailto"; href: string; labelKey: string; fallback: string };

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
        { kind: "link", href: "/discover", labelKey: "nav.projects", fallback: "发现" },
        { kind: "link", href: "/work", labelKey: "nav.workspace", fallback: "工作台" },
        { kind: "link", href: "/pricing", labelKey: "nav.pricing", fallback: "定价" },
        { kind: "link", href: "/signup", labelKey: "nav.signup", fallback: "注册" },
      ],
    },
    {
      titleKey: "footer.developers",
      links: [
        { kind: "link", href: "/settings/developers", labelKey: "nav.developers", fallback: "开发者设置" },
        { kind: "link", href: "/settings/api-keys", labelKey: "footer.apiKeys", fallback: "API 密钥" },
        { kind: "link", href: "/api/v1/openapi.json", labelKey: "footer.openapi", fallback: "OpenAPI" },
        { kind: "link", href: "/settings/developers", labelKey: "footer.docs", fallback: "接入说明" },
      ],
    },
    {
      titleKey: "footer.company",
      links: [
        { kind: "link", href: "/#about", labelKey: "footer.about", fallback: "关于" },
        { kind: "link", href: "/rules", labelKey: "footer.rules", fallback: "社区规则" },
        { kind: "link", href: "/aigc", labelKey: "footer.aigc", fallback: "AIGC 说明" },
        { kind: "mailto", href: "mailto:support@vibehub.dev", labelKey: "footer.contact", fallback: "联系支持" },
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
                { icon: GitBranch, href: "https://github.com/KBREX684/vibehub", labelKey: "footer.github", fallback: "GitHub" },
                { icon: BookOpen, href: "/settings/developers", labelKey: "footer.docs", fallback: "接入说明" },
                { icon: Mail, href: "mailto:support@vibehub.dev", labelKey: "footer.contact", fallback: "联系支持" },
              ].map(({ icon: Icon, href, labelKey, fallback }) => (
                <a
                  key={labelKey}
                  href={href}
                  className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
                  aria-label={t(labelKey, fallback)}
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
                          {t(link.labelKey, link.fallback)}
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
                        {t(link.labelKey, link.fallback)}
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
