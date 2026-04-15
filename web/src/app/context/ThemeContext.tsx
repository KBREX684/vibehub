"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { THEME_COOKIE_KEY } from "@/lib/i18n";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "vibehub-theme";

function readStoredTheme(): ThemeChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function browserPreferredTheme(fallback: ThemeChoice): ThemeChoice {
  return readStoredTheme() ?? fallback;
}

function resolveEffectiveDark(choice: ThemeChoice): boolean {
  if (choice === "dark") return true;
  if (choice === "light") return false;
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDomTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = resolveEffectiveDark(choice);
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}

function persistTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE_KEY}=${choice};path=/;max-age=${maxAge};SameSite=Lax`;
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
    setThemeState(browserPreferredTheme(initialTheme));
  }, [initialTheme]);

  useEffect(() => {
    if (!mounted) return;
    applyDomTheme(theme);
    persistTheme(theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDomTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    applyDomTheme(t);
    persistTheme(t);
  }, []);

  const effectiveDark = mounted ? resolveEffectiveDark(theme) : resolveEffectiveDark(initialTheme);

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
