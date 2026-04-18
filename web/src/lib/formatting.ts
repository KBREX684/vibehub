import type { Lang } from "@/lib/i18n";

export function localeForLanguage(language?: string | null): string {
  return language === "zh" ? "zh-CN" : "en-US";
}

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalizedDate(
  value: Date | string | number,
  language: Lang | string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(localeForLanguage(language), options).format(date);
}

export function formatLocalizedDateTime(
  value: Date | string | number,
  language: Lang | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(localeForLanguage(language), options).format(date);
}

export function formatLocalizedTime(
  value: Date | string | number,
  language: Lang | string,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(localeForLanguage(language), options).format(date);
}

export function formatLocalizedNumber(
  value: number,
  language: Lang | string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(localeForLanguage(language), options).format(value);
}

export function formatRelativeTime(
  value: Date | string | number,
  language: Lang | string
): string {
  const date = toDate(value);
  if (!date) return "";

  const diffMs = date.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);
  const weeks = Math.round(diffMs / (86400000 * 7));
  const months = Math.round(diffMs / (86400000 * 30));
  const years = Math.round(diffMs / (86400000 * 365));
  const rtf = new Intl.RelativeTimeFormat(localeForLanguage(language), { numeric: "auto" });

  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  if (Math.abs(days) < 7) return rtf.format(days, "day");
  if (Math.abs(weeks) < 5) return rtf.format(weeks, "week");
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(years, "year");
}
