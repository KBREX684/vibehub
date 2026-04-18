"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { THEME_COOKIE_KEY } from "@/lib/i18n";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "vibehub-theme";

function resolveEffectiveDark(): boolean {
  return true;
}

function applyDomTheme(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = resolveEffectiveDark();
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}

function persistTheme(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "dark");
  } catch {
    /* ignore */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE_KEY}=dark;path=/;max-age=${maxAge};SameSite=Lax`;
}

const ThemeContext = createContext<{
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  effectiveDark: boolean;
} | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemeChoice;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeChoice>(initialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setThemeState("dark");
  }, [initialTheme]);

  useEffect(() => {
    if (!mounted) return;
    applyDomTheme();
    persistTheme();
  }, [theme, mounted]);

  const setTheme = useCallback(() => {
    setThemeState("dark");
    applyDomTheme();
    persistTheme();
  }, []);

  const effectiveDark = true;

  const value = useMemo(
    () => ({ theme, setTheme, effectiveDark }),
    [theme, setTheme, effectiveDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
