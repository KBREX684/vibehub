"use client";

/**
 * v8 SiteNav — replaces the earlier TopNav layout for the new five-pillar
 * information architecture: 广场 · 项目 · 团队 · 开发者 · 定价.
 *
 * Differences vs the legacy TopNav:
 *   - Five primary nav slots (no more 7+ pill), aligned with v8 strategy.
 *   - Logged-in users get "发讨论 / 建项目 / 我的 Agent" quick actions, which
 *     are the three main creation surfaces in the AI+Human collaboration loop.
 *   - The account dropdown surfaces "我的 Agent" and "我的团队" as first-class
 *     entries — agents are treated as teammates, not buried under settings.
 *   - Theme switcher is kept behind the existing ThemeContext without adding
 *     new light-mode assets; v8 does not ship a light-mode refresh.
 */

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
  User,
  Bot,
  Users,
  MessageSquarePlus,
  FolderPlus,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/app/context/AuthContext";
import { openCommandPalette } from "@/components/command-palette";
import { Avatar } from "@/components/ui";

type NavLink = {
  href: string;
  /** i18n key (defaults resolve to Chinese label in v8 locales). */
  key: string;
  /** When true, link is considered active only on exact path match. */
  exact?: boolean;
};

/**
 * Primary information architecture for v8. Keep this list in sync with
 * `docs/product-strategy-v8.md` §1.1 (four-pillar definition) + pricing.
 */
const NAV_LINKS: NavLink[] = [
  { href: "/discussions", key: "nav.discussions" },
  { href: "/discover", key: "nav.projects" },
  { href: "/teams", key: "nav.teams" },
  { href: "/developers", key: "nav.developers" },
  { href: "/pricing", key: "nav.pricing" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { user, loading, logout, unreadCount } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const createMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();
  const userMenuId = useId();
  const createMenuId = useId();

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setMobileOpen(false);
        setCreateMenuOpen(false);
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuOpen && !userMenuRef.current?.contains(target) && !userMenuButtonRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }
      if (createMenuOpen && !createMenuRef.current?.contains(target) && !createMenuButtonRef.current?.contains(target)) {
        setCreateMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [userMenuOpen, createMenuOpen]);

  function isActive(link: NavLink) {
    if (link.exact) return pathname === link.href;
    if (link.href === "/") return pathname === "/";
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  const createItems: Array<{ href: string; icon: typeof Bot; label: string; desc: string }> = [
    {
      href: "/discussions/new",
      icon: MessageSquarePlus,
      label: t("nav.quick.new_post", "发一条讨论"),
      desc: t("nav.quick.new_post_desc", "在广场发帖，让同行看到你的想法"),
    },
    {
      href: "/projects/new",
      icon: FolderPlus,
      label: t("nav.quick.new_project", "建一个项目"),
      desc: t("nav.quick.new_project_desc", "发布作品，获得协作者"),
    },
    {
      href: "/settings/agents",
      icon: Bot,
      label: t("nav.quick.agents", "我的 Agent"),
      desc: t("nav.quick.agents_desc", "绑定与管理你的协作 Agent"),
    },
  ];

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
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label={t("a11y.main_navigation", "主导航")}
          className="hidden md:flex items-center gap-0.5 bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-1 py-1 rounded-[var(--radius-pill)]"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative inline-flex min-w-[6.75rem] items-center justify-center px-3.5 py-1.5 text-sm font-medium rounded-[var(--radius-pill)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]"
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
            className="hidden sm:grid min-w-[15.5rem] grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="min-w-0 text-left text-xs truncate">{t("search.placeholder")}</span>
            <kbd className="hidden lg:inline text-[10px] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">⌘K</kbd>
          </button>

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            aria-label={t("nav.toggle_language")}
            className="inline-flex min-w-[4.5rem] items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors"
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{language === "en" ? "EN" : "中"}</span>
          </button>

          {/* Quick-create menu (logged-in only) */}
          {!loading && user ? (
            <div className="relative hidden md:block">
              <button
                ref={createMenuButtonRef}
                type="button"
                onClick={() => setCreateMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={createMenuOpen}
                aria-controls={createMenuId}
                className="inline-flex min-w-[7.5rem] items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] text-xs font-semibold border border-[var(--color-text-primary)] hover:opacity-90 transition-opacity"
              >
                <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("nav.quick.create", "创建")}</span>
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {createMenuOpen ? (
                  <motion.div
                    ref={createMenuRef}
                    id={createMenuId}
                    role="menu"
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden"
                  >
                    {createItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setCreateMenuOpen(false)}
                          className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-surface)] transition-colors border-b border-[var(--color-border-subtle)] last:border-b-0"
                        >
                          <span className="shrink-0 w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)]">
                            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          </span>
                          <span className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</span>
                            <span className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">{item.desc}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {/* Notifications */}
          {user ? (
            <Link
              href="/notifications"
              aria-label={t("nav.notifications")}
              className="relative p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
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
                          { href: "/settings/profile", icon: User, key: "nav.profile", label: "个人主页" },
                          { href: "/settings/agents", icon: Bot, key: "nav.my_agents", label: "我的 Agent" },
                          { href: "/teams", icon: Users, key: "nav.my_teams", label: "我的团队" },
                          { href: "/settings/api-keys", icon: Key, key: "nav.api_keys", label: "API 密钥" },
                          { href: "/notifications", icon: Bell, key: "nav.notifications", label: "通知" },
                          { href: "/settings/account", icon: User, key: "nav.account", label: "账号设置" },
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
              <Link href="/login" className="btn btn-primary min-w-[6.25rem] justify-center text-sm px-4 py-1.5">
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
            className="md:hidden absolute top-full inset-x-0 border-t border-[var(--color-border)] bg-[var(--color-bg-canvas)]/90 backdrop-blur-md shadow-[var(--shadow-modal)]"
          >
            <nav aria-label={t("a11y.mobile_navigation", "移动端导航")} className="container py-3 flex max-h-[calc(100vh-3.5rem)] flex-col gap-1 overflow-y-auto">
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
                  <div className="grid grid-cols-3 gap-2 px-1">
                    {createItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                          <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
