import en from "@/locales/en.json";
import zh from "@/locales/zh.json";

export type Lang = "en" | "zh";
type NestedMessageValue = string | { [key: string]: NestedMessageValue };
type NestedMessageCatalog = Record<string, NestedMessageValue>;
type FlatMessageCatalog = Record<string, string>;

export const LANGUAGE_COOKIE_KEY = "vibehub_language";

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

export async function getServerTranslator() {
  const language = await getServerLanguage();
  const t = (key: string, fallback?: string) => catalogs[language][key] ?? catalogs.en[key] ?? fallback ?? key;
  return { language, t };
}

export function getClientTranslator(language: Lang) {
  return (key: string, fallback?: string) => catalogs[language][key] ?? catalogs.en[key] ?? fallback ?? key;
}

