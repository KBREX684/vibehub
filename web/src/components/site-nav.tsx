"use client";

/**
 * v11 SiteNav — collapsed from v8's five-pillar to 3 entries:
 * Home / Studio / Pricing.
 *
 * Logged-in users get a single "新建工作记录" quick action linking to /studio.
 * The account dropdown surfaces Studio-related entries only.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Zap,
  LogOut,
  Shield,
  Key,
  User,
  Settings,
  Compass,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/app/context/AuthContext";
import { openCommandPalette } from "@/components/command-palette";
import { Avatar } from "@/components/ui";

type NavLink = {
  href: string;
  /** i18n key */
  key: string;
  /** When true, link is considered active only on exact path match. */
  exact?: boolean;
};

/**
 * v11 primary navigation — 3 entries only.
 */
const NAV_LINKS: NavLink[] = [
  { href: "/", key: "nav.home", exact: true },
  { href: "/studio", key: "nav.studio" },
  { href: "/pricing", key: "nav.pricing" },
];

/**
 * Paths where the main site navigation (logo + nav pills + user menu) is
 * hidden entirely. Auth pages get a distraction-free layout per Claude.ai.
 */
const HIDDEN_PATHS = ["/login", "/signup", "/reset-password", "/onboarding"];

/**
 * Paths where the 3-pill primary nav is hidden (but brand + user menu stay).
 * These are "workspace" pages that already have a left sidebar — showing the
 * pill nav on top would duplicate IA.
 */
const WORKSPACE_PATH_PREFIXES = ["/studio", "/ledger", "/settings", "/u/", "/admin"];

export function SiteNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading, logout, unreadCount } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Hide entirely on auth/onboarding pages
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  // On workspace pages, collapse to a minimal chrome (no pill nav)
  const isWorkspacePage = WORKSPACE_PATH_PREFIXES.some((p) => pathname.startsWith(p));

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
      const target = event.target as Node;
      if (userMenuOpen && !userMenuRef.current?.contains(target) && !userMenuButtonRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [userMenuOpen]);

  function isActive(link: NavLink) {
    if (link.exact) return pathname === "/";
    if (link.href === "/") return pathname === "/";
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]/90 backdrop-blur-md">
      <div className="container flex items-center justify-between h-14 gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 font-semibold text-[15px] tracking-tight text-[var(--color-text-primary)]"
          aria-label="VibeHub"
        >
          <span className="w-7 h-7 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] flex items-center justify-center shadow-[inset_0_1px_0_var(--color-featured-highlight)]">
            <Zap className="w-4 h-4 text-[var(--color-text-primary)]" aria-hidden="true" />
          </span>
          <span>VibeHub</span>
          <span className="hidden sm:inline text-[10px] font-mono text-[var(--color-text-muted)] tracking-wider uppercase ml-0.5">
            AI 留痕本
          </span>
        </Link>

        {/* Desktop nav — hidden on workspace pages to avoid double IA */}
        <nav
          aria-label={t("a11y.main_navigation", "主导航")}
          className={`${isWorkspacePage ? "hidden" : "hidden md:flex"} items-center gap-0.5 bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-1 py-1 rounded-[var(--radius-pill)]`}
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative inline-flex w-[6.8rem] xl:w-[7.1rem] items-center justify-center px-3.5 py-1.5 text-sm font-medium rounded-[var(--radius-pill)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]"
                style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <motion.div
                    layoutId="siteNavActive"
                    className="absolute inset-0 bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-[var(--radius-pill)]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                ) : null}
                <span className="relative z-10">{t(link.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("nav.open_search", "打开搜索")}
            className="hidden sm:grid w-[15.75rem] grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="min-w-0 text-left text-xs truncate">{t("search.placeholder")}</span>
            <kbd className="hidden lg:inline text-[10px] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">⌘K</kbd>
          </button>

          {/* v11.0: Chinese-only — language toggle removed by RFC §0.1 freeze. */}

          {/* Quick-create (logged-in only) — single action.
              v11.1: uses the warm Sienna primary (single CTA per page rule). */}
          {!loading && user ? (
            <Link
              href="/studio"
              className="hidden md:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-accent)] text-xs font-semibold border border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)] active:scale-[0.98] transition-all duration-150"
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("nav.quick.new_work", "新建工作记录")}</span>
            </Link>
          ) : null}

          {/* Notifications */}
          {user ? (
            <Link
              href="/notifications"
              aria-label={t("nav.notifications")}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          {/* User / Auth */}
          {!loading ? (
            user ? (
              <div className="relative">
                <button
                  ref={userMenuButtonRef}
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-controls={userMenuId}
                  aria-label={t("nav.user_menu", "打开用户菜单")}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
                >
                  <Avatar tone="neutral" size="sm" initial={user.name?.charAt(0) || "U"} alt={user.name} />
                  <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)] max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {userMenuOpen ? (
                    <motion.div
                      ref={userMenuRef}
                      id={userMenuId}
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden"
                    >
                      <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] m-0 truncate">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] m-0 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { href: "/studio", icon: Compass, key: "nav.studio", label: "Studio" },
                          { href: "/settings/profile", icon: User, key: "nav.profile", label: "个人主页" },
                          { href: "/settings/api-keys", icon: Key, key: "nav.api_keys", label: "API 密钥" },
                          { href: "/settings/account", icon: Settings, key: "nav.account", label: "账号设置" },
                          { href: "/admin", icon: Shield, key: "nav.admin", label: "管理后台", adminOnly: true },
                        ]
                          .filter((item) => !item.adminOnly || user.role === "admin")
                          .map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setUserMenuOpen(false)}
                              role="menuitem"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
                            >
                              <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                              {t(item.key, item.label)}
                            </Link>
                          ))}
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          role="menuitem"
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                          {t("auth.sign_out")}
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary w-[6.5rem] justify-center text-sm px-4 py-1.5">
                {t("auth.sign_in")}
              </Link>
            )
          ) : null}

          {/* Mobile menu button */}
          <button
            ref={mobileMenuButtonRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-label={mobileOpen ? t("a11y.close_mobile_menu", "关闭菜单") : t("a11y.open_mobile_menu", "打开菜单")}
            className="md:hidden p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id={mobileMenuId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="md:hidden absolute top-full inset-x-0 z-[60] border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)] shadow-[var(--shadow-modal)]"
          >
            <div className="container py-3">
              <nav
                aria-label={t("a11y.mobile_navigation", "移动端导航")}
                className="relative z-[61] flex max-h-[calc(100vh-5rem)] flex-col gap-1 overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-3 py-3 shadow-[var(--shadow-modal)]"
              >
                {NAV_LINKS.map((link) => {
                  const active = isActive(link);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                        active
                          ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {t(link.key)}
                    </Link>
                  );
                })}
                {user ? (
                  <>
                    <div className="border-t border-[var(--color-border)] mt-2 pt-2" />
                    <Link
                      href="/studio"
                      onClick={() => setMobileOpen(false)}
                      className="btn btn-primary w-full text-center"
                    >
                      {t("nav.quick.new_work", "新建工作记录")}
                    </Link>
                  </>
                ) : null}
                {!loading && !user ? (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-primary w-full mt-2 text-center"
                  >
                    {t("auth.sign_in")}
                  </Link>
                ) : null}
              </nav>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
