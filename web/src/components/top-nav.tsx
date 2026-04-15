"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
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
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/app/context/AuthContext";
import { openCommandPalette } from "@/components/command-palette";

const NAV_LINKS = [
  { href: "/", key: "nav.overview" },
  { href: "/discover", key: "nav.discover" },
  { href: "/discussions", key: "nav.discussions" },
  { href: "/challenges", key: "nav.challenges" },
  { href: "/teams", key: "nav.teams" },
  { href: "/leaderboards", key: "nav.leaderboards" },
  { href: "/developers", key: "nav.developers" },
];

export function TopNav() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, loading, logout, unreadCount } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();
  const userMenuId = useId();

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (!userMenuOpen) return;
      if (userMenuRef.current?.contains(event.target as Node)) return;
      if (userMenuButtonRef.current?.contains(event.target as Node)) return;
      setUserMenuOpen(false);
    }

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [userMenuOpen]);

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
        <nav
          aria-label={t("a11y.main_navigation")}
          className="hidden md:flex items-center gap-1 bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-1.5 py-1 rounded-[var(--radius-pill)]"
        >
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
                <span className="relative z-10">{t(link.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("nav.open_search")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">{t("search.placeholder")}</span>
            <kbd className="hidden lg:inline text-[10px] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">⌘K</kbd>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            aria-label={t("nav.toggle_language")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === "en" ? "EN" : "中"}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
            aria-label={t("nav.theme_cycle")}
            title={`${t("nav.theme_light")} / ${t("nav.theme_dark")} / ${t("nav.theme_system")}`}
            className="flex items-center justify-center p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
          >
            {theme === "light" ? <Sun className="w-4 h-4" /> : theme === "dark" ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>

          {/* Notifications (if logged in) */}
          {user && (
            <Link
              href="/notifications"
              aria-label={t("nav.notifications")}
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
                  ref={userMenuButtonRef}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-controls={userMenuId}
                  aria-label={t("nav.user_menu")}
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
                      ref={userMenuRef}
                      id={userMenuId}
                      role="menu"
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
                          {
                            href: "/workspace/enterprise",
                            icon: Briefcase,
                            key: "nav.radar_workspace",
                            requiresEnterprise: true,
                          },
                          { href: "/settings/api-keys", icon: Key, key: "nav.api_keys" },
                          { href: "/notifications", icon: Bell, key: "nav.notifications" },
                          { href: "/admin", icon: Shield, key: "nav.admin", adminOnly: true },
                        ]
                          .filter(
                            (item) =>
                              (!item.adminOnly || user.role === "admin") &&
                              (!item.requiresEnterprise || user.enterpriseStatus === "approved")
                          )
                          .map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setUserMenuOpen(false)}
                              role="menuitem"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
                            >
                              <item.icon className="w-3.5 h-3.5" />
                              {t(item.key)}
                            </Link>
                          ))}
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          role="menuitem"
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {t("auth.sign_out")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn btn-primary text-sm px-4 py-1.5"
              >
                {t("auth.sign_in")}
              </Link>
            )
          )}

          {/* Mobile menu button */}
          <button
            ref={mobileMenuButtonRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-label={mobileOpen ? t("a11y.close_mobile_menu") : t("a11y.open_mobile_menu")}
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
            id={mobileMenuId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)]"
          >
            <nav aria-label={t("a11y.mobile_navigation")} className="container py-3 flex flex-col gap-1">
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
                  {t(link.key)}
                </Link>
              ))}
              <div className="border-t border-[var(--color-border)] mt-2 pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    openCommandPalette();
                    setMobileOpen(false);
                  }}
                  aria-label={t("nav.open_search")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] flex-1 text-left"
                >
                  <Search className="w-4 h-4" />
                  {t("search.button")}
                </button>
                <button
                  onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                  aria-label={t("nav.toggle_language")}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]"
                >
                  <Globe className="w-4 h-4" />
                  {language === "en" ? "EN" : "中文"}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
                  aria-label={t("nav.theme_cycle")}
                  className="flex items-center justify-center p-2.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]"
                >
                  {theme === "light" ? <Sun className="w-4 h-4" /> : theme === "dark" ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                </button>
              </div>
              {!loading && !user && (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn btn-primary w-full mt-1 text-center"
                >
                  {t("auth.sign_in")}
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
