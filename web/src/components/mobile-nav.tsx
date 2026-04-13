"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/discussions", label: "Discussions" },
  { href: "/teams", label: "Teams" },
  { href: "/collections", label: "Topics" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/pricing", label: "Pricing" },
  { href: "/settings/subscription", label: "Subscription" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/admin", label: "Admin" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="p-2 -mr-2 text-[#333336]"
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-[60]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
              className="fixed top-0 right-0 bottom-0 w-[min(320px,85vw)] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] border-l border-[rgba(255,255,255,0.6)] shadow-2xl z-[70] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-black/5">
                <span className="font-semibold text-lg tracking-tight text-[#333336]">Menu</span>
                <motion.button
                  onClick={() => setOpen(false)}
                  className="p-2 -mr-2 text-[#333336] bg-black/5 rounded-full"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-[16px] text-[15px] font-medium text-[#333336] hover:bg-black/5 transition-colors active:scale-[0.98]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="p-6 border-t border-black/5">
                <motion.a
                  href="/api/v1/auth/github?redirect=/"
                  className="flex items-center justify-center w-full py-3 rounded-[980px] bg-[#007aff] text-white font-medium shadow-sm"
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ boxShadow: "0 0 16px rgba(129, 230, 217, 0.4)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  Login with GitHub
                </motion.a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
