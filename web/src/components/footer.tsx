"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

const FOOTER_COLUMNS = [
  {
    title: "产品",
    links: [
      { href: "/", label: "Home" },
      { href: "/studio", label: "Studio" },
      { href: "/ledger", label: "Ledger" },
      { href: "/u/dev-alice", label: "Card" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "开发者",
    links: [
      { href: "/aigc", label: "API 文档" },
      { href: "/aigc", label: "vibehub-verify CLI" },
      { href: "/aigc", label: "MCP server" },
    ],
  },
  {
    title: "合规",
    links: [
      { href: "/aigc", label: "AIGC 公示" },
      { href: "/privacy", label: "隐私" },
      { href: "/terms", label: "条款" },
      { href: "/rules", label: "平台规则" },
    ],
  },
  {
    title: "关于",
    links: [
      { href: "/", label: "博客" },
      { href: "/", label: "联系" },
    ],
  },
];

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)]">
      <div className="container py-12">
        {/* Top: 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom: brand + legal */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center justify-center">
              <Zap className="w-3 h-3 text-[var(--color-text-primary)]" />
            </span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">VibeHub</span>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">AI 留痕本</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} VibeHub · 备案号占位
          </p>
        </div>
      </div>
    </footer>
  );
}
