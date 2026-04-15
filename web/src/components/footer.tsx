"use client";

import Link from "next/link";
import { Zap, Globe, Link2 } from "lucide-react";
import { useLanguage, t } from "@/app/context/LanguageContext";

export function Footer() {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)] mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand col */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-base text-[var(--color-text-primary)] mb-3">
              <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </span>
              VibeHub
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs">
              {t(language,
                "The premier collaboration network for Vibe Coding developers.",
                "面向 Vibe Coding 开发者的顶尖协作与展示平台。"
              )}
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: Link2,  href: "https://github.com",  label: "GitHub"  },
                { icon: Link2,  href: "https://twitter.com", label: "Twitter" },
                { icon: Globe,  href: "/",                    label: "Website" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {[
            {
              title: { en: "Platform", zh: "平台" },
              links: [
                { href: "/discover",     en: "Discover",     zh: "发现项目" },
                { href: "/discussions",  en: "Discussions",  zh: "社区讨论" },
                { href: "/teams",        en: "Teams",        zh: "团队" },
                { href: "/leaderboards", en: "Leaderboards", zh: "排行榜" },
              ],
            },
            {
              title: { en: "Developers", zh: "开发者" },
              links: [
                { href: "/settings/api-keys",    en: "API Keys",  zh: "API 密钥" },
                { href: "/api/v1/openapi.json",  en: "OpenAPI",   zh: "OpenAPI 文档" },
                { href: "/pricing",              en: "Pricing",   zh: "定价" },
                { href: "/workspace/enterprise", en: "Radar Workspace", zh: "雷达工作台" },
              ],
            },
            {
              title: { en: "Company", zh: "关于" },
              links: [
                { kind: "link" as const, href: "/#about", en: "About", zh: "关于我们" },
                { kind: "soon" as const, en: "Blog", zh: "博客" },
                { kind: "soon" as const, en: "Careers", zh: "招聘" },
                { kind: "mailto" as const, href: "mailto:support@vibehub.dev", en: "Contact", zh: "联系我们" },
              ],
            },
          ].map((col) => (
            <div key={col.title.en}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                {t(language, col.title.en, col.title.zh)}
              </h4>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => {
                  if (link.kind === "soon") {
                    const label = `${t(language, link.en, link.zh)} (${t(language, "Coming soon", "即将推出")})`;
                    return (
                      <li key={link.en}>
                        <span className="text-sm text-[var(--color-text-muted)] cursor-default">{label}</span>
                      </li>
                    );
                  }
                  if (link.kind === "mailto") {
                    return (
                      <li key={link.en}>
                        <a
                          href={link.href}
                          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          {t(language, link.en, link.zh)}
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
                        {t(language, link.en, link.zh)}
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
            © {new Date().getFullYear()} VibeHub.{" "}
            {t(language, "All rights reserved.", "保留所有权利。")}
          </p>
          <div className="flex items-center gap-4">
            {[
              { href: "/privacy", en: "Privacy Policy", zh: "隐私政策" },
              { href: "/terms", en: "Terms of Service", zh: "服务条款" },
            ].map((item) => (
              <Link
                key={item.en}
                href={item.href}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {t(language, item.en, item.zh)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
