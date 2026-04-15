"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { Sparkles, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  candidates: Project[];
  featured: Project[];
}

export function AdminDailyFeaturedPanel({ candidates, featured }: Props) {
  const [slug, setSlug] = useState("");
  const [rank, setRank] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function feature() {
    setBusy(true);
    setMsg(null);
    const s = slug.trim();
    if (!s) {
      setMsg("Enter a project slug");
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
        setMsg(json?.error?.message ?? "Request failed");
        return;
      }
      setMsg(`Featured “${json?.data?.project?.slug ?? s}” (rank ${rank}). Refresh Discover / home to see it.`);
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
        setMsg(json?.error?.message ?? "Unfeature failed");
        return;
      }
      setMsg(`Removed featured slot for “${s}”.`);
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
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Daily featured projects</h2>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] m-0">
        Curates the “Featured today” rail on the home page and Discover. Uses{" "}
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
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">No featured projects right now.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
          Slug
          <input className="input-base" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="vibehub" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
          Rank (1 = top)
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
            {busy ? "…" : "Set featured"}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">Quick pick</p>
        <div className="flex flex-wrap gap-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn btn-secondary text-xs px-2 py-1"
              disabled={busy}
              onClick={() => setSlug(p.slug)}
            >
              {p.slug}
            </button>
          ))}
        </div>
      </div>

      {msg ? <p className="text-xs text-[var(--color-text-secondary)] m-0">{msg}</p> : null}
    </div>
  );
}
