"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
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
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Search projects, discussions, creators..."
        className="w-full py-3 pl-11 pr-28 bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-[var(--radius-pill)] border border-[var(--color-border)] outline-none transition-all duration-200 font-medium"
        style={{
          borderColor: isFocused ? "var(--color-primary)" : undefined,
          boxShadow: isFocused ? "0 0 0 3px var(--color-primary-subtle)" : undefined,
        }}
        aria-label="Search"
      />

      {query.length > 0 && (
        <button
          type="submit"
          className="absolute right-2 btn btn-primary text-xs px-4 py-2 flex items-center gap-1"
        >
          Search
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </form>
  );
}
