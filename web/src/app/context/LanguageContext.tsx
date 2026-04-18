"use client";

import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LANGUAGE_COOKIE_KEY,
  getClientTranslator,
  getServerTranslator,
  type Lang,
  isLang,
} from "@/lib/i18n";

const STORAGE_KEY = "vibehub-language";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type LanguageContextType = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

export const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
});

export const useLanguage = () => useContext(LanguageContext);
export const useTranslate = () => useLanguage().t;

function browserPreferredLanguage(initialLanguage: Lang): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLang(stored)) return stored;
  const nav = window.navigator.language.toLowerCase();
  return nav.startsWith("zh") ? "zh" : initialLanguage;
}

function persistLanguage(language: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: Lang;
}) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Lang>(initialLanguage);

  useEffect(() => {
    const preferred = browserPreferredLanguage(initialLanguage);
    setLanguageState(preferred);
    persistLanguage(preferred);
    if (preferred !== initialLanguage) {
      startTransition(() => router.refresh());
    }
  }, [initialLanguage, router]);

  useEffect(() => {
    persistLanguage(language);
  }, [language]);

  const value = useMemo<LanguageContextType>(() => {
    const translate = getClientTranslator(language);
    return {
      language,
      setLanguage: (nextLanguage) => {
        if (nextLanguage === language) return;
        setLanguageState(nextLanguage);
        persistLanguage(nextLanguage);
        startTransition(() => router.refresh());
      },
      t: translate,
    };
  }, [language, router]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export async function getTranslator() {
  return getServerTranslator();
}
