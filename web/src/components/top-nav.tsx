"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Globe,
  Menu,
  X,
  ChevronDown,
  Zap,
  LogOut,
  Shield,
  Key,
  Briefcase,
} from "lucide-react";
import { useLanguage, t } from "@/app/context/LanguageContext";
import { useAuth } from "@/app/context/AuthContext";

const NAV_LINKS = [
  { href: "/",             en: "Overview",     zh: "概览" },
  { href: "/discover",     en: "Discover",     zh: "发现" },
  { href: "/discussions",  en: "Discussions",  zh: "讨论" },
  { href: "/challenges",   en: "Challenges",   zh: "挑战赛" },
  { href: "/teams",        en: "Teams",        zh: "团队" },
  { href: "/leaderboards", en: "Leaderboards", zh: "排行榜" },
  { href: "/developers",   en: "Developers",   zh: "开发者" },
];

export function TopNav() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);

  // Fetch unread notification count when logged in
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    let active = true;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/v1/me/notifications?unread=1&limit=50");
        if (!res.ok) return;
        const json = await res.json();
        const items = json?.data?.notifications ?? [];
        if (active) setUnreadCount(items.length);
      } catch { /* ignore */ }
    }
    fetchUnread();
    // Poll every 60 s
    const timer = setInterval(fetchUnread, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [user]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]/90 backdrop-blur-md">
      <div className="container flex items-center justify-between h-14 gap-4">

        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 font-bold text-lg tracking-tight text-[var(--color-text-primary)]"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </span>
          <span>VibeHub</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-1.5 py-1 rounded-[var(--radius-pill)]">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3.5 py-1.5 text-sm font-medium rounded-[var(--radius-pill)] transition-colors outline-none"
                style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
              >
                {active && (
                  <motion.div
                    layoutId="navActive"
                    className="absolute inset-0 bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-[var(--radius-pill)]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{t(language, link.en, link.zh)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <Link
            href="/search"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">{t(language, "Search...", "搜索...")}</span>
            <kbd className="hidden lg:inline text-[10px] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">⌘K</kbd>
          </Link>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === "en" ? "EN" : "中"}</span>
          </button>

          {/* Notifications (if logged in) */}
          {user && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* User / Auth */}
          {!loading && (
            user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all"
                >
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-violet)] flex items-center justify-center text-white text-xs font-semibold">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)] max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden"
                    >
                      <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { href: "/workspace/enterprise", icon: Briefcase, en: "Workspace", zh: "工作台" },
                          { href: "/settings/api-keys",    icon: Key,       en: "API Keys",  zh: "API 密钥" },
                          { href: "/notifications",        icon: Bell,      en: "Notifications", zh: "通知" },
                          { href: "/admin",                icon: Shield,    en: "Admin",     zh: "管理后台", adminOnly: true },
                        ]
                          .filter(item => !item.adminOnly || user.role === "admin")
                          .map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
                            >
                              <item.icon className="w-3.5 h-3.5" />
                              {t(language, item.en, item.zh)}
                            </Link>
                          ))}
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {t(language, "Sign Out", "退出登录")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {userMenuOpen && (
                  <div className="fixed inset-0 z-[-1]" onClick={() => setUserMenuOpen(false)} />
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="btn btn-primary text-sm px-4 py-1.5"
              >
                {t(language, "Sign in", "登录")}
              </Link>
            )
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)]"
          >
            <nav className="container py-3 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
                  }`}
                >
                  {t(language, link.en, link.zh)}
                </Link>
              ))}
              <div className="border-t border-[var(--color-border)] mt-2 pt-2 flex items-center gap-3">
                <Link href="/search" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] flex-1">
                  <Search className="w-4 h-4" />
                  {t(language, "Search", "搜索")}
                </Link>
                <button
                  onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]"
                >
                  <Globe className="w-4 h-4" />
                  {language === "en" ? "EN" : "中文"}
                </button>
              </div>
              {!loading && !user && (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn btn-primary w-full mt-1 text-center"
                >
                  {t(language, "Sign in", "登录")}
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
