"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  LANGUAGE_COOKIE_KEY,
  getClientTranslator,
  getServerTranslator,
  type Lang,
  isLang,
} from "@/lib/i18n";
const STORAGE_KEY = "vibehub-language";

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

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: Lang;
}) {
  const [language, setLanguageState] = useState<Lang>(initialLanguage);

  useEffect(() => {
    setLanguageState(browserPreferredLanguage(initialLanguage));
  }, [initialLanguage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
      document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [language]);

  const value = useMemo<LanguageContextType>(() => {
    const translate = getClientTranslator(language);
    return {
      language,
      setLanguage: setLanguageState,
      t: translate,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export async function getTranslator() {
  return getServerTranslator();
}
