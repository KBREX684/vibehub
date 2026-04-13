"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Challenge } from "@/lib/types";
import { Calendar, Trophy } from "lucide-react";

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const statusColors: Record<string, string> = {
    draft: "bg-black/5 text-[var(--color-text-secondary)]",
    active: "bg-[#f5ebd4]/10 text-[#f5ebd4]",
    closed: "bg-black/5 text-[var(--color-text-tertiary)]",
  };

  const statusLabels: Record<string, string> = {
    draft: "Upcoming",
    active: "Active",
    closed: "Ended",
  };

  const statusColor = statusColors[challenge.status] || statusColors.draft;
  const statusLabel = statusLabels[challenge.status] || "Unknown";

  const startDate = new Date(challenge.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endDate = new Date(challenge.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <motion.article 
      className="relative flex flex-col h-full bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] rounded-[24px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer"
      whileHover={{ y: -4, scale: 1.01, boxShadow: "0 16px 48px -8px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Decorative Cyber Glow for Active Challenges */}
      {challenge.status === 'active' && (
        <motion.div 
          className="absolute -top-10 -right-10 w-32 h-32 bg-[#f5ebd4] rounded-full blur-[48px] opacity-20 pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-[980px] ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] font-medium bg-black/5 px-2.5 py-1 rounded-[980px]">
            <Calendar className="w-3.5 h-3.5" />
            {startDate} - {endDate}
          </span>
        </div>

        <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3 leading-[1.1] transition-colors">
          <Link href={`/challenges/${challenge.slug}`} className="before:absolute before:inset-0 outline-none">
            {challenge.title}
          </Link>
        </h3>

        <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.47] mb-6 line-clamp-3">
          {challenge.description}
        </p>

        <div className="mt-auto pt-5 border-t border-black/5 flex flex-col gap-4 relative z-20">
          <div className="flex flex-wrap gap-2">
            {challenge.tags.map((tag) => (
              <span key={`${challenge.id}-${tag}`} className="text-[11px] font-medium px-2.5 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center text-[var(--color-accent-apple)] text-sm font-medium group-hover:gap-2 transition-all">
            View Details <Trophy className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
