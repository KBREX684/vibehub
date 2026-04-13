"use client";

import { createContext, useContext, useState } from "react";

type Lang = "en" | "zh";

type LanguageContextType = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
};

export const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Lang>("en");
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const t = (lang: Lang, enText: string, zhText: string) =>
  lang === "en" ? enText : zhText;
