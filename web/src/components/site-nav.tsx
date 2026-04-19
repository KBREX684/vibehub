"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  FolderOpenDot,
  FolderPlus,
  Key,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Settings2,
  Shield,
  X,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/app/context/AuthContext";
import { openCommandPalette } from "@/components/command-palette";
import { Avatar } from "@/components/ui";

type NavLink = { href: string; key: string; label: string };

const GUEST_LINKS: NavLink[] = [
  { href: "/", key: "nav.home", label: "首页" },
  { href: "/discover", key: "nav.projects", label: "发现" },
  { href: "/pricing", key: "nav.pricing", label: "定价" },
];

const AUTHED_LINKS: NavLink[] = [
  { href: "/discover", key: "nav.projects", label: "发现" },
  { href: "/work", key: "nav.workspace", label: "工作台" },
  { href: "/work/library", key: "nav.library", label: "项目库" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading, logout, unreadCount } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuId = useId();
  const createMenuId = useId();
  const links = user ? AUTHED_LINKS : GUEST_LINKS;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuOpen && !userMenuRef.current?.contains(target) && !userButtonRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }
      if (createMenuOpen && !createMenuRef.current?.contains(target) && !createButtonRef.current?.contains(target)) {
        setCreateMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setUserMenuOpen(false);
        setCreateMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [createMenuOpen, userMenuOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const createItems = [
    { href: "/p/new", label: "新建项目", desc: "创建公开或私密项目，并接入工作台。", },
    { href: "/work/create-team", label: "新建团队工作区", desc: "创建团队并邀请协作者进入共享空间。", },
    { href: "/work/library", label: "导入项目", desc: "从项目库发起导入与工作区收纳流程。", },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]/90 backdrop-blur-md">
      <div className="container relative flex h-14 items-center justify-between gap-3">
        <Link href={user ? "/work" : "/"} className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-[var(--color-text-primary)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)]">
            <Zap className="h-4 w-4" />
          </span>
          <span>VibeHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative inline-flex min-w-[7rem] items-center justify-center rounded-[var(--radius-pill)] px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]"
                style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
              >
                {active ? (
                  <motion.div
                    layoutId="site-nav-active-pill"
                    className="absolute inset-0 rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)]"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">{t(link.key, link.label)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("nav.open_search", "打开搜索")}
            className="hidden sm:grid w-[15.75rem] grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)]"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate text-left text-xs">{t("search.placeholder", "搜索项目、创作者与团队")}</span>
            <kbd className="hidden rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] lg:inline">
              ⌘K
            </kbd>
          </button>

          {!loading && user ? (
            <>
              <div className="relative hidden md:block">
                <button
                  ref={createButtonRef}
                  type="button"
                  onClick={() => setCreateMenuOpen((value) => !value)}
                  className="inline-flex w-[8rem] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-canvas)]"
                  aria-haspopup="menu"
                  aria-expanded={createMenuOpen}
                  aria-controls={createMenuId}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>{t("nav.create", "创建")}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                <AnimatePresence>
                  {createMenuOpen ? (
                    <motion.div
                      ref={createMenuRef}
                      id={createMenuId}
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)]"
                    >
                      {createItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setCreateMenuOpen(false)}
                          className="block border-b border-[var(--color-border-subtle)] px-3 py-3 last:border-b-0 hover:bg-[var(--color-bg-surface)]"
                        >
                          <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</div>
                          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.desc}</div>
                        </Link>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {user.subscriptionTier === "free" ? (
                <Link href="/settings/subscription" className="hidden md:inline-flex w-[6.5rem] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
                  {t("nav.upgrade", "升级")}
                </Link>
              ) : null}

              <Link
                href="/work/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                aria-label={t("nav.notifications", "通知")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-1 text-[10px] font-mono text-[var(--color-text-primary)]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>

              <div className="relative">
                <button
                  ref={userButtonRef}
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="inline-flex h-9 min-w-[3rem] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2 text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-controls={userMenuId}
                >
                  <Avatar tone="neutral" size="sm" initial={user.name.charAt(0)} alt={user.name} />
                  <ChevronDown className="hidden h-3 w-3 sm:block" />
                </button>
                <AnimatePresence>
                  {userMenuOpen ? (
                    <motion.div
                      ref={userMenuRef}
                      id={userMenuId}
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)]"
                    >
                      {[
                        { href: "/work/personal", icon: LayoutGrid, label: t("nav.workspace", "工作台") },
                        { href: "/work/library", icon: FolderOpenDot, label: t("nav.library", "项目库") },
                        { href: "/settings/developers", icon: Key, label: t("nav.developers", "开发者设置") },
                        { href: "/settings", icon: Settings2, label: t("nav.settings", "设置") },
                        ...(user.role === "admin" ? [{ href: "/admin", icon: Shield, label: "管理后台" }] : []),
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] last:border-b-0"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t("nav.logout", "退出登录")}</span>
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          ) : (
            !loading && (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="inline-flex w-[6rem] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
                  {t("nav.login", "登录")}
                </Link>
                <Link href="/signup" className="inline-flex w-[6.5rem] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-canvas)]">
                  {t("nav.signup", "注册")}
                </Link>
              </div>
            )
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] md:hidden"
            aria-label={mobileOpen ? "关闭导航" : "打开导航"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 right-0 top-full mt-2 md:hidden"
            >
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-bg-canvas)]/95 p-3 shadow-[var(--shadow-modal)] backdrop-blur-md max-h-[calc(100vh-5rem)] overflow-y-auto">
                <div className="space-y-1">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex min-h-[2.75rem] items-center rounded-[var(--radius-lg)] border px-3 py-2 text-sm",
                        isActive(link.href)
                          ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                          : "border-transparent text-[var(--color-text-secondary)]",
                      ].join(" ")}
                    >
                      {t(link.key, link.label)}
                    </Link>
                  ))}
                  {user ? (
                    <>
                      <Link href="/work/notifications" onClick={() => setMobileOpen(false)} className="flex min-h-[2.75rem] items-center justify-between rounded-[var(--radius-lg)] border border-transparent px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                        <span>{t("nav.notifications", "通知")}</span>
                        {unreadCount > 0 ? <Badge count={unreadCount} /> : null}
                      </Link>
                      <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex min-h-[2.75rem] items-center rounded-[var(--radius-lg)] border border-transparent px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                        {t("nav.settings", "设置")}
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileOpen(false)} className="flex min-h-[2.75rem] items-center rounded-[var(--radius-lg)] border border-transparent px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                        {t("nav.login", "登录")}
                      </Link>
                      <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex min-h-[2.75rem] items-center rounded-[var(--radius-lg)] border border-transparent px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                        {t("nav.signup", "注册")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[1.5rem] justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-primary)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
