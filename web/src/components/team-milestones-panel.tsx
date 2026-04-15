"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { motion, AnimatePresence } from "framer-motion";
import type { TeamMilestone } from "@/lib/types";
import { Target, Calendar, CheckCircle2, Circle, Plus, Trash2, Globe, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  teamSlug: string;
  currentUserId: string | null;
}

export function TeamMilestonesPanel({ teamSlug, currentUserId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<TeamMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones`, {
        credentials: "include",
      });
      const json = (await res.json()) as { data?: { milestones?: TeamMilestone[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Failed to load milestones");
        setItems([]);
        return;
      }
      setItems(json.data?.milestones ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    if (currentUserId) {
      void load();
    }
  }, [currentUserId, load]);

  async function createMilestone(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const [y, mo, d] = targetDate.split("-").map(Number);
      const targetIso = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0)).toISOString();
      const body: Record<string, unknown> = {
        title: title.trim(),
        targetDate: targetIso,
      };
      if (description.trim()) {
        body.description = description.trim();
      }
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Create failed");
        return;
      }
      setTitle("");
      setDescription("");
      setTargetDate("");
      setIsFormOpen(false);
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function patchMilestone(id: string, patch: Record<string, unknown>) {
    setMsg(null);
    try {
      const res = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Update failed");
        return;
      }
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeMilestone(id: string) {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    setMsg(null);
    try {
      const res = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Delete failed");
        return;
      }
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (!currentUserId) {
    return (
      <div className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] text-center">
        <Target className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">Milestones</h2>
        <p className="text-[0.95rem] text-[var(--color-text-secondary)] mb-6">
          Log in to view and manage team milestones.
        </p>
        {isDevDemoAuth() ? (
          <a
            href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(`/teams/${teamSlug}`)}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-[980px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]"
          >
            Demo Login
          </a>
        ) : (
          <Link
            href={`/login?redirect=${encodeURIComponent(`/teams/${teamSlug}`)}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-[980px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]"
          >
            Sign in
          </Link>
        )}
      </div>
    );
  }

  const inputClasses = "w-full bg-black/5 border border-transparent rounded-[12px] px-4 py-3 text-[0.95rem] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-300 focus:bg-white focus:border-[#81e6d9]/50 focus:shadow-[0_0_16px_rgba(129,230,217,0.3)]";

  return (
    <div className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#f5ebd4]/40 flex items-center justify-center text-[#d97706]">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Milestones</h2>
        </div>
        <motion.button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-[980px] bg-black/5 text-[var(--color-text-primary)] text-sm font-medium hover:bg-black/10 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <Plus className={`w-4 h-4 transition-transform duration-300 ${isFormOpen ? 'rotate-45' : ''}`} />
          {isFormOpen ? 'Cancel' : 'New Milestone'}
        </motion.button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.form 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
            onSubmit={(ev) => void createMilestone(ev)}
          >
            <div className="p-6 rounded-[24px] bg-black/5 border border-black/5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={inputClasses} placeholder="e.g., MVP Launch" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Target Date</label>
                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required className={inputClasses} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} className={`${inputClasses} resize-none`} placeholder="What defines success for this milestone?" />
              </div>
              <div className="pt-2 flex justify-end">
                <motion.button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-[12px] bg-[var(--color-text-primary)] text-white font-medium hover:bg-black transition-colors shadow-sm"
                  whileTap={{ scale: 0.97 }}
                >
                  Create Milestone
                </motion.button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {msg && <p className="text-[0.9rem] font-medium text-[#e11d48] bg-[#fee2e2] px-4 py-3 rounded-[12px] mb-6">{msg}</p>}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12 text-[var(--color-text-tertiary)]">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)] bg-black/5 rounded-[24px] border border-black/5">
          <p className="text-[0.95rem]">No milestones defined yet.</p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 border-l-2 border-black/5 space-y-10 py-4">
          {items.map((m, index) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Glowing Timeline Node */}
              <div className="absolute -left-[35px] md:-left-[43px] top-1 flex items-center justify-center w-6 h-6 bg-white rounded-full border-2 border-transparent">
                {m.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-[#34c759] bg-white rounded-full" />
                ) : (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <Circle className="w-5 h-5 text-[var(--color-accent-apple)]" />
                    <motion.div 
                      className="absolute inset-0 bg-[var(--color-accent-apple)] rounded-full opacity-20 blur-[4px]"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </div>

              <div className={`p-6 rounded-[24px] transition-all duration-300 border ${
                m.completed 
                  ? "bg-black/5 border-transparent opacity-80" 
                  : "bg-white border-black/5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:border-[#81e6d9]/40"
              }`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className={`text-lg font-semibold tracking-tight mb-1 ${m.completed ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                      {m.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-[0.85rem] text-[var(--color-text-tertiary)] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Target: {new Date(m.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-black/10" />
                      <button 
                        onClick={() => void patchMilestone(m.id, { visibility: m.visibility === "public" ? "team_only" : "public" })}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[980px] transition-colors ${
                          m.visibility === "public" ? "bg-[#34c759]/10 text-[#248a3d] hover:bg-[#34c759]/20" : "bg-black/5 text-[var(--color-text-secondary)] hover:bg-black/10"
                        }`}
                      >
                        {m.visibility === "public" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {m.visibility === "public" ? "Public" : "Internal"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button 
                      onClick={() => void patchMilestone(m.id, { completed: !m.completed })}
                      className={`px-3 py-1.5 rounded-[12px] text-sm font-medium transition-colors ${
                        m.completed ? "bg-black/5 text-[var(--color-text-secondary)] hover:bg-black/10" : "bg-[#34c759]/10 text-[#248a3d] hover:bg-[#34c759]/20"
                      }`}
                    >
                      {m.completed ? "Reopen" : "Complete"}
                    </button>
                    <button 
                      onClick={() => void removeMilestone(m.id)}
                      className="p-1.5 rounded-[12px] text-[var(--color-text-tertiary)] hover:bg-[#fee2e2] hover:text-[#e11d48] transition-colors"
                      aria-label="Delete milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {m.description && (
                  <p className={`text-[0.95rem] leading-[1.6] mb-6 ${m.completed ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {m.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[0.85rem] font-medium">
                    <span className={m.completed ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]'}>Progress</span>
                    <span className={m.completed ? 'text-[#34c759]' : 'text-[var(--color-accent-apple)]'}>{m.progress}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full"
                        style={{ backgroundColor: m.completed ? "#34c759" : "var(--color-accent-apple)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${m.progress}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 15 }}
                      />
                    </div>
                    {!m.completed && (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={m.progress}
                        onChange={(e) => void patchMilestone(m.id, { progress: Number(e.target.value) })}
                        className="w-24 accent-[var(--color-accent-apple)]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
