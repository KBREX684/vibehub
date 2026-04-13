"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MobileNav } from "./mobile-nav";
import { ChevronDown } from "lucide-react";

const CORE_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/discussions", label: "Discussions" },
  { href: "/teams", label: "Teams" },
  { href: "/collections", label: "Topics" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50 w-full flex justify-center px-4 mb-8 pointer-events-none">
      <motion.div 
        className="pointer-events-auto w-full max-w-5xl flex items-center justify-between px-6 py-3 rounded-[980px] border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.75)] backdrop-blur-[20px] saturate-[180%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04),0_0_1px_0_rgba(0,0,0,0.08)]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
      >
        <Link href="/" className="font-semibold text-lg tracking-tight text-[#333336] flex-shrink-0">
          VibeHub
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {CORE_LINKS.map((link) => {
            const isActive = pathname?.startsWith(link.href);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className="relative text-sm font-medium transition-colors duration-200"
                style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-[#007aff]"
                    transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
                  />
                )}
              </Link>
            );
          })}
          
          <div className="group relative flex items-center gap-1 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors duration-200 py-2">
            More <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            
            {/* Dropdown Bento Box */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
              <div className="flex flex-col gap-1 p-2 rounded-[20px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] border border-[rgba(255,255,255,0.6)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.15)] min-w-[160px]">
                <Link href="/leaderboards" className="px-4 py-2.5 text-sm font-medium text-[#333336] rounded-xl hover:bg-black/5 transition-colors">Leaderboards</Link>
                <Link href="/pricing" className="px-4 py-2.5 text-sm font-medium text-[#333336] rounded-xl hover:bg-black/5 transition-colors">Pricing</Link>
                <Link href="/admin" className="px-4 py-2.5 text-sm font-medium text-[#333336] rounded-xl hover:bg-black/5 transition-colors">Admin</Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          <motion.a 
            href="/api/v1/auth/github?redirect=/" 
            className="px-5 py-2 rounded-[980px] bg-[#007aff] text-white text-sm font-medium transition-colors hover:bg-[#0062cc]"
            whileHover={{ boxShadow: "0 0 16px rgba(129, 230, 217, 0.4)" }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            Login
          </motion.a>
        </div>

        <div className="md:hidden flex-shrink-0">
          <MobileNav />
        </div>
      </motion.div>
    </header>
  );
}
