"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索项目、帖子、创作者…"
        style={{
          flex: 1,
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          font: "inherit",
          background: "#fff",
          fontSize: "0.95rem",
        }}
        aria-label="搜索"
      />
      <button
        type="submit"
        className="button ghost"
        style={{ whiteSpace: "nowrap" }}
      >
        搜索
      </button>
    </form>
  );
}
