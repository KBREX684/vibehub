"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Home, 
  Compass, 
  MessageSquare, 
  Users, 
  Trophy, 
  Box, 
  Settings, 
  ShieldAlert,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/discussions", label: "Discussions", icon: MessageSquare },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/collections", label: "Topics", icon: Box },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
];

const SETTINGS_LINKS = [
  { href: "/settings/api-keys", label: "API Keys", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const NavItem = ({ href, label, icon: Icon }: { href: string, label: string, icon: React.ElementType }) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    
    return (
      <Link 
        href={href}
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] font-medium transition-colors duration-200 outline-none group"
      >
        {isActive && (
          <motion.div
            layoutId="sidebarActiveIndicator"
            className="absolute inset-0 bg-[#f5ebd4]/50 border border-[#f5ebd4] rounded-[12px] z-0"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-[#d97706]' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)]'}`} />
        <span className={`relative z-10 text-[0.95rem] ${isActive ? 'text-[#d97706] font-semibold' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] border-b border-[rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-4">
        <Link href="/" className="font-semibold text-lg tracking-tight text-[var(--color-text-primary)]">
          VibeHub
        </Link>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -mr-2 text-[var(--color-text-primary)] rounded-full hover:bg-black/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 z-50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-[260px] bg-[#fbfbfd] border-r border-[rgba(0,0,0,0.04)] z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="h-16 flex items-center justify-between px-6 border-b border-[rgba(0,0,0,0.04)] shrink-0">
          <Link href="/" className="font-semibold text-lg tracking-tight text-[var(--color-text-primary)]">
            VibeHub
          </Link>
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 -mr-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8 hide-scrollbar">
          
          <div className="flex flex-col gap-1">
            <div className="px-3 mb-2 text-[0.75rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Menu</div>
            {NAV_LINKS.map(link => <NavItem key={link.href} {...link} />)}
          </div>

          <div className="flex flex-col gap-1">
            <div className="px-3 mb-2 text-[0.75rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Settings</div>
            {SETTINGS_LINKS.map(link => <NavItem key={link.href} {...link} />)}
          </div>

        </div>

        <div className="p-4 border-t border-[rgba(0,0,0,0.04)] shrink-0">
          <a 
            href="/api/v1/auth/github?redirect=/" 
            className="flex items-center justify-center w-full py-2.5 rounded-[12px] bg-white border border-[rgba(0,0,0,0.05)] text-[var(--color-text-primary)] text-[0.95rem] font-medium shadow-sm hover:bg-black/5 transition-colors active:scale-[0.98]"
          >
            Login
          </a>
        </div>

      </aside>
    </>
  );
}
