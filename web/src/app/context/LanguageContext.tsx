"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { getClientTranslator, getServerTranslator, type Lang } from "@/lib/i18n";

type LanguageContextType = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

export const LanguageContext = createContext<LanguageContextType>({
  language: "zh",
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
});

export const useLanguage = () => useContext(LanguageContext);
export const useTranslate = () => useLanguage().t;

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = "zh-CN";
  }, []);

  const value = useMemo<LanguageContextType>(() => {
    const language: Lang = "zh";
    const translate = getClientTranslator();
    return {
      language,
      setLanguage: () => {},
      t: translate,
    };
  }, []);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export async function getTranslator() {
  return getServerTranslator();
}
