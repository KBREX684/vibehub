"use client";

import { useState, useEffect } from "react";
import { Zap, RefreshCw, Trophy, CheckCircle2, Users, MessageSquare, FolderGit2, Star } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDateTime } from "@/lib/formatting";

interface CreditProfile {
  userId: string;
  score: number;
  tasksCompleted: number;
  milestonesHit: number;
  joinRequestsMade: number;
  postsAuthored: number;
  commentsAuthored: number;
  projectsCreated: number;
  intentsApproved: number;
  updatedAt: string;
}

export function ContributionCreditPanel({ userId }: { userId: string }) {
  const { language, t } = useLanguage();
  const [credit, setCredit] = useState<CreditProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/v1/me/reputation")
      .then((r) => r.json())
      .then((j) => setCredit(j?.data ?? null))
      .catch(() => setCredit(null))
      .finally(() => setLoading(false));
  }, [userId]);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await apiFetch("/api/v1/me/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json();
      if (j?.data) setCredit(j.data);
    } finally {
      setRefreshing(false);
    }
  }

  const scoreColor =
    (credit?.score ?? 0) >= 500
      ? "text-[var(--color-warning)]"
      : (credit?.score ?? 0) >= 200
        ? "text-[var(--color-success)]"
        : "text-[var(--color-text-secondary)]";

  const STATS = credit
    ? [
        { key: "tasksCompleted", icon: CheckCircle2, label: t("credit.tasks_completed", "Tasks completed"), value: credit.tasksCompleted, color: "var(--color-success)" },
        { key: "milestonesHit", icon: Trophy, label: t("credit.milestones_hit", "Milestones hit"), value: credit.milestonesHit, color: "var(--color-warning)" },
        { key: "projectsCreated", icon: FolderGit2, label: t("credit.projects_created", "Projects created"), value: credit.projectsCreated, color: "var(--color-primary-hover)" },
        { key: "commentsAuthored", icon: MessageSquare, label: t("credit.comments_authored", "Comments authored"), value: credit.commentsAuthored, color: "var(--color-accent-cyan)" },
        { key: "intentsApproved", icon: Users, label: t("credit.intents_approved", "Intents approved"), value: credit.intentsApproved, color: "var(--color-accent-violet)" },
        { key: "postsAuthored", icon: Star, label: t("credit.posts_authored", "Posts authored"), value: credit.postsAuthored, color: "var(--color-featured)" },
      ]
    : [];

  if (loading) {
    return (
      <div className="card p-6 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-[var(--color-bg-elevated)] rounded" />
        <div className="h-8 w-20 bg-[var(--color-bg-elevated)] rounded" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--color-warning)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("credit.title", "Contribution credit")}</h3>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-40"
          title={t("credit.refresh_title", "Recalculate score")}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          {t("common.refresh", "Refresh")}
        </button>
      </div>

      {/* Score */}
      <div className="text-center py-3 border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
        <div className={`text-4xl font-bold ${scoreColor}`}>
          {credit?.score ?? 0}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1">
          {(credit?.score ?? 0) >= 500
            ? t("credit.top_contributor", "Top contributor")
            : (credit?.score ?? 0) >= 200
              ? t("credit.active_contributor", "Active contributor")
              : (credit?.score ?? 0) >= 50
                ? t("credit.rising_member", "Rising member")
                : t("credit.getting_started", "Getting started")}
        </div>
      </div>

      {/* Stats grid */}
      {STATS.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {STATS.filter((s) => s.value > 0 || s.key === "tasksCompleted").map(({ key, icon: Icon, label, value, color }) => (
            <div key={key} className="p-3 bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                <span className="text-[10px] text-[var(--color-text-muted)] leading-none">{label}</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text-primary)]" style={{ color: value > 0 ? color : undefined }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {credit && (
        <p className="text-[10px] text-[var(--color-text-muted)] text-center">
          {t("credit.updated_at", "Last updated")}: {formatLocalizedDateTime(credit.updatedAt, language)}
        </p>
      )}
    </div>
  );
}
