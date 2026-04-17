import en from "@/locales/en.json";
import zh from "@/locales/zh.json";

export type Lang = "en" | "zh";
type NestedMessageValue = string | { [key: string]: NestedMessageValue };
type NestedMessageCatalog = Record<string, NestedMessageValue>;
type FlatMessageCatalog = Record<string, string>;

export const LANGUAGE_COOKIE_KEY = "vibehub_language";
export const THEME_COOKIE_KEY = "vibehub_theme";

function flattenCatalog(
  source: NestedMessageCatalog,
  prefix = "",
  target: FlatMessageCatalog = {}
): FlatMessageCatalog {
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      target[nextKey] = value;
    } else {
      flattenCatalog(value as NestedMessageCatalog, nextKey, target);
    }
  }
  return target;
}

const catalogs: Record<Lang, FlatMessageCatalog> = {
  en: flattenCatalog(en as NestedMessageCatalog),
  zh: flattenCatalog(zh as NestedMessageCatalog),
};

export function isLang(value: string | undefined | null): value is Lang {
  return value === "en" || value === "zh";
}

export async function getServerLanguage(): Promise<Lang> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const candidate = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  return isLang(candidate) ? candidate : "en";
}

export type ThemeCookie = "light" | "dark" | "system";

export function isThemeCookie(value: string | undefined | null): value is ThemeCookie {
  return value === "light" || value === "dark" || value === "system";
}

/** P3-FE-1: theme for initial HTML class (client script refines before paint). */
export async function getServerThemePreference(): Promise<ThemeCookie> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const candidate = cookieStore.get(THEME_COOKIE_KEY)?.value;
  return isThemeCookie(candidate) ? candidate : "dark";
}

/** SSR hint for `<html className>` — client ThemeScript refines before paint. */
export function htmlClassForThemePreference(pref: ThemeCookie): string {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return "dark";
}

export async function getServerTranslator() {
  const language = await getServerLanguage();
  const t = (key: string, fallback?: string) => catalogs[language][key] ?? catalogs.en[key] ?? fallback ?? key;
  return { language, t };
}

export function getClientTranslator(language: Lang) {
  return (key: string, fallback?: string) => catalogs[language][key] ?? catalogs.en[key] ?? fallback ?? key;
}
