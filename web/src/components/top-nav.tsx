"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/discover", label: "Discover" },
  { href: "/discussions", label: "Discussions" },
  { href: "/teams", label: "Teams" },
  { href: "/leaderboards", label: "Leaderboards" },
];

const SETTINGS_LINKS = [
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/admin", label: "Admin" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-bg-canvas)]/80 backdrop-blur-md border-b border-[var(--color-border-light)] mb-8">
      <div className="container flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
        
        {/* Brand & Main Links */}
        <div className="flex items-center gap-8 overflow-x-auto hide-scrollbar">
          <Link href="/" className="font-bold text-xl tracking-tight text-[var(--color-text-primary)] shrink-0">
            VibeHub
          </Link>
          
          <nav className="flex items-center gap-1 bg-white border border-[var(--color-border-light)] p-1 rounded-[980px] shadow-sm shrink-0">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className="relative px-4 py-1.5 text-[0.9rem] font-medium rounded-[980px] transition-colors outline-none"
                  style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="topnavActiveIndicator"
                      className="absolute inset-0 bg-[var(--color-bg-canvas)] border border-[var(--color-border-light)] rounded-[980px] z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Settings & Auth */}
        <div className="flex items-center gap-4 shrink-0">
          <nav className="flex items-center gap-4 text-[0.9rem] font-medium text-[var(--color-text-secondary)]">
            {SETTINGS_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--color-text-primary)] transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          
          <div className="w-[1px] h-4 bg-[var(--color-border-light)]" />
          
          <a 
            href="/api/v1/auth/github?redirect=/" 
            className="px-5 py-2 rounded-[980px] bg-[var(--color-accent-primary)] text-white text-[0.9rem] font-medium hover:bg-black transition-colors shadow-sm"
          >
            Login
          </a>
        </div>

      </div>
    </header>
  );
}
