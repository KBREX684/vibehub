"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

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
    <motion.form 
      onSubmit={handleSubmit} 
      className="relative flex items-center w-full max-w-2xl mx-auto"
      initial={false}
      animate={{
        scale: isFocused ? 1.02 : 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="absolute left-4 text-[var(--color-text-tertiary)] pointer-events-none">
        <Search className="w-5 h-5" />
      </div>
      
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Search projects, discussions, creators..."
        className="w-full py-4 pl-12 pr-24 bg-[rgba(0,0,0,0.04)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] rounded-[980px] outline-none transition-all duration-300 text-[1.05rem] font-medium"
        style={{
          boxShadow: isFocused ? "0 0 0 4px rgba(129, 230, 217, 0.15), inset 0 0 0 1px rgba(129, 230, 217, 0.4)" : "inset 0 0 0 1px transparent",
          backgroundColor: isFocused ? "#ffffff" : "rgba(0,0,0,0.04)",
        }}
        aria-label="Search"
      />
      
      <AnimatePresence>
        {query.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            type="submit"
            className="absolute right-2 px-4 py-2 bg-[var(--color-accent-apple)] text-white text-sm font-medium rounded-[980px] hover:bg-[#0062cc] transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            Search
          </motion.button>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
