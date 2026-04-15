"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Challenge } from "@/lib/types";
import { Calendar, Trophy } from "lucide-react";

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:  { label: "Upcoming", cls: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]" },
    active: { label: "Active",   cls: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[rgba(251,191,36,0.25)]" },
    closed: { label: "Ended",    cls: "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]" },
  };

  const { label: statusLabel, cls: statusCls } =
    statusConfig[challenge.status] ?? statusConfig.draft;

  const startDate = new Date(challenge.startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDate = new Date(challenge.endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.article
      className="card relative flex flex-col h-full p-7 overflow-hidden cursor-pointer"
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 30 } }}
      whileTap={{ scale: 0.98 }}
    >
      {challenge.status === "active" && (
        <motion.div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[48px] pointer-events-none"
          style={{ backgroundColor: "var(--color-warning)", opacity: 0.08 }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-[var(--radius-pill)] border ${statusCls}`}>
            {statusLabel}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Calendar className="w-3.5 h-3.5" />
            {startDate} – {endDate}
          </span>
        </div>

        <h3 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3 leading-snug">
          <Link href={`/challenges/${challenge.slug}`} className="before:absolute before:inset-0 outline-none">
            {challenge.title}
          </Link>
        </h3>

        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6 line-clamp-3 flex-grow">
          {challenge.description}
        </p>

        <div className="mt-auto pt-5 border-t border-[var(--color-border)] flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {challenge.tags.map((tag) => (
              <span key={`${challenge.id}-${tag}`} className="tag">#{tag}</span>
            ))}
          </div>

          <div className="flex items-center text-[var(--color-accent-apple)] text-sm font-medium gap-1.5">
            View Details <Trophy className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
