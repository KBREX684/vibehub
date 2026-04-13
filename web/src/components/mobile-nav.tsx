"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

const NAV_LINKS = [
  { href: "/discussions", label: "Discussions" },
  { href: "/discover", label: "Discover" },
  { href: "/teams", label: "Teams" },
  { href: "/collections", label: "Topics" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/admin", label: "Admin" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <button
        className="mobile-nav-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <span className={`hamburger ${open ? "active" : ""}`} />
      </button>

      {open ? (
        <div className="mobile-nav-backdrop" onClick={close}>
          <nav className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <Link href="/" className="brand" onClick={close}>
                VibeHub
              </Link>
              <button className="mobile-nav-close" onClick={close} aria-label="Close menu">
                &times;
              </button>
            </div>
            <div className="mobile-nav-links">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={close}>
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mobile-nav-footer">
              <a href="/api/v1/auth/github?redirect=/" className="button" style={{ textAlign: "center", width: "100%" }}>
                Login with GitHub
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
