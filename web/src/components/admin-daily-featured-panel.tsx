"use client";

import { useState } from "react";
import type { AdminAiInsight, Project } from "@/lib/types";
import { Sparkles, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";

interface Props {
  candidates: Array<Project & { adminAi?: AdminAiInsight }>;
  featured: Project[];
}

export function AdminDailyFeaturedPanel({ candidates, featured }: Props) {
  const { t } = useLanguage();
  const [slug, setSlug] = useState("");
  const [rank, setRank] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function feature() {
    setBusy(true);
    setMsg(null);
    const s = slug.trim();
    if (!s) {
      setMsg(t("admin.daily_featured.enter_slug", "Enter a project slug"));
      setBusy(false);
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/admin/projects/${encodeURIComponent(s)}/feature-today`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(json?.error?.message ?? t("admin.daily_featured.request_failed", "Request failed"));
        return;
      }
      setMsg(
        t(
          "admin.daily_featured.featured_success",
          "Featured “{slug}” (rank {rank}). Refresh Discover / home to see it."
        )
          .replace("{slug}", json?.data?.project?.slug ?? s)
          .replace("{rank}", String(rank))
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function unfeature(s: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/v1/admin/projects/${encodeURIComponent(s)}/feature-today`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(json?.error?.message ?? t("admin.daily_featured.unfeature_failed", "Unfeature failed"));
        return;
      }
      setMsg(
        t("admin.daily_featured.unfeatured_success", "Removed featured slot for “{slug}”.").replace("{slug}", s)
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--color-featured)]" />
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
          {t("admin.daily_featured.title", "Daily featured projects")}
        </h2>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] m-0">
        {t("admin.daily_featured.description_prefix", "Curates the “Featured today” rail on the home page and Discover. Uses")}{" "}
        <code className="text-[var(--color-text-secondary)]">PATCH /api/v1/admin/projects/:slug/feature-today</code>.
      </p>

      {featured.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {featured.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1 border-b border-[var(--color-border-subtle)] last:border-0">
              <span className="font-mono text-[var(--color-text-secondary)] truncate">{p.slug}</span>
              <button
                type="button"
                className="btn btn-ghost text-xs px-2 py-1 shrink-0"
                disabled={busy}
                onClick={() => unfeature(p.slug)}
                aria-label={t("admin.daily_featured.remove", "Remove featured project")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t("admin.daily_featured.empty", "No featured projects right now.")}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
          {t("admin.daily_featured.slug", "Slug")}
          <input className="input-base" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="vibehub" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
          {t("admin.daily_featured.rank", "Rank (1 = top)")}
          <input
            className="input-base"
            type="number"
            min={1}
            value={rank}
            onChange={(e) => setRank(Number(e.target.value) || 1)}
          />
        </label>
        <div className="flex items-end">
          <button type="button" className="btn btn-primary text-sm w-full" disabled={busy} onClick={feature}>
            {busy ? "…" : t("admin.daily_featured.set_featured", "Set featured")}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
          {t("admin.daily_featured.quick_pick", "Quick pick")}
        </p>
        <div className="space-y-2">
          {candidates.map((p) => (
            <div key={p.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{p.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">/{p.slug}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-xs px-2 py-1"
                  disabled={busy}
                  onClick={() => setSlug(p.slug)}
                >
                  {t("admin.daily_featured.pick", "Pick")}
                </button>
              </div>
              {p.adminAi ? (
                <div className="mt-3 text-xs text-[var(--color-text-secondary)] space-y-1">
                  <p className="m-0">{p.adminAi.suggestion}</p>
                  <p className="m-0">
                    {t("admin.daily_featured.queue", "Queue")}: {p.adminAi.queue ?? "featured-curation"} · {t("admin.daily_featured.priority", "Priority")}: {p.adminAi.priority ?? "normal"} · {t("admin.daily_featured.risk", "Risk")}: {p.adminAi.riskLevel}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {msg ? <p className="text-xs text-[var(--color-text-secondary)] m-0">{msg}</p> : null}
    </div>
  );
}
