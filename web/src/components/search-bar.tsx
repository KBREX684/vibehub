"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

const SEARCH_INPUT_CLASS =
  "w-full py-3 pl-11 pr-28 bg-[var(--color-bg-canvas)] text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-[var(--radius-md)] border border-[var(--color-border)] outline-none transition-all duration-200 font-mono";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { t } = useLanguage();
  const canSubmit = query.trim().length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (canSubmit) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center w-full"
    >
      <div className="absolute left-4 text-[var(--color-text-muted)] pointer-events-none">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search.placeholder")}
        className={`${SEARCH_INPUT_CLASS} focus:border-[var(--color-text-primary)]`}
        aria-label={t("common.search")}
      />

      {query.length > 0 && (
        <button
          type="submit"
          disabled={!canSubmit}
          className="absolute right-2 btn btn-primary text-xs px-4 py-2 flex items-center gap-1 disabled:opacity-100"
        >
          {t("common.search")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </form>
  );
}
