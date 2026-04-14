"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { motion, AnimatePresence } from "framer-motion";
import type { TeamMember, TeamMilestone, TeamTask, TeamTaskStatus } from "@/lib/types";
import { KanbanSquare, Plus, User, Trash2, ArrowUp, ArrowDown, ChevronDown, Target } from "lucide-react";

interface Props {
  teamSlug: string;
  members: TeamMember[];
  milestones: TeamMilestone[];
  currentUserId: string | null;
  /** Team owner can batch-change task status */
  isOwner?: boolean;
}

const STATUSES: { value: TeamTaskStatus; label: string; color: string; bg: string }[] = [
  { value: "todo", label: "To Do", color: "text-[var(--color-text-secondary)]", bg: "bg-black/5" },
  { value: "doing", label: "In Progress", color: "text-[#0d9488]", bg: "bg-[#81e6d9]/20" },
  { value: "done", label: "Done", color: "text-[#248a3d]", bg: "bg-[#34c759]/10" },
];

const BOARD_COLUMNS: { status: TeamTaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "doing", title: "In Progress" },
  { status: "done", title: "Done" },
];

function sortTasksForColumn(rows: TeamTask[]): TeamTask[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
}

export function TeamTasksPanel({ teamSlug, members, milestones, currentUserId, isOwner }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newMilestoneId, setNewMilestoneId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const tasksByStatus = useMemo(() => {
    const map: Record<TeamTaskStatus, TeamTask[]> = { todo: [], doing: [], done: [] };
    for (const t of tasks) {
      map[t.status].push(t);
    }
    (Object.keys(map) as TeamTaskStatus[]).forEach((k) => {
      map[k] = sortTasksForColumn(map[k]);
    });
    return map;
  }, [tasks]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks`, {
        credentials: "include",
      });
      const json = (await res.json()) as { data?: { tasks?: TeamTask[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Failed to load tasks");
        setTasks([]);
        return;
      }
      setTasks(json.data?.tasks ?? []);
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

  async function createTask(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const body: Record<string, unknown> = { title: newTitle.trim() };
      if (newDesc.trim()) {
        body.description = newDesc.trim();
      }
      if (newAssignee) {
        body.assigneeUserId = newAssignee;
      }
      if (newMilestoneId) {
        body.milestoneId = newMilestoneId;
      }
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks`, {
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
      setNewTitle("");
      setNewDesc("");
      setNewAssignee("");
      setNewMilestoneId("");
      setIsFormOpen(false);
      await load();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    setMsg(null);
    try {
      // Optimistic Update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } as TeamTask : t));

      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}`,
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
        await load(); // Revert on failure
        return;
      }
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
      await load(); // Revert on failure
    }
  }

  async function reorderTask(taskId: string, direction: "up" | "down") {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}/reorder`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        }
      );
      const json = (await res.json()) as {
        data?: { tasks?: TeamTask[] };
        error?: { message?: string; code?: string };
      };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Reorder failed");
        return;
      }
      if (json.data?.tasks) {
        setTasks(json.data.tasks);
      } else {
        await load();
      }
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  function toggleSelected(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function batchSetStatus(status: TeamTaskStatus) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/batch`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: ids, status }),
      });
      const json = (await res.json()) as { data?: { tasks?: TeamTask[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Batch update failed");
        return;
      }
      setSelectedIds(new Set());
      if (json.data?.tasks?.length) {
        setTasks((prev) => {
          const byId = new Map(json.data!.tasks!.map((t) => [t.id, t]));
          return prev.map((t) => byId.get(t.id) ?? t);
        });
      } else {
        await load();
      }
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setMsg(null);
    try {
      const res = await fetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}`,
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
        <KanbanSquare className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">Task Board</h2>
        <p className="text-[0.95rem] text-[var(--color-text-secondary)] mb-6">
          Log in to view and manage team tasks.
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
            <KanbanSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Task Board</h2>
            <p className="text-[0.95rem] text-[var(--color-text-secondary)] m-0">Fluid Kanban Workspace</p>
          </div>
        </div>
        <motion.button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-[980px] bg-[var(--color-text-primary)] text-white text-sm font-medium hover:bg-black transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.15)] self-start md:self-auto"
          whileTap={{ scale: 0.95 }}
        >
          <Plus className={`w-4 h-4 transition-transform duration-300 ${isFormOpen ? 'rotate-45' : ''}`} />
          {isFormOpen ? 'Cancel' : 'New Task'}
        </motion.button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.form 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
            onSubmit={(ev) => void createTask(ev)}
          >
            <div className="p-6 rounded-[24px] bg-black/5 border border-black/5 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Task Title</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required maxLength={200} className={inputClasses} placeholder="e.g., Design new landing page" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Description (optional)</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={2000} className={`${inputClasses} resize-none`} placeholder="Add more details..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 relative">
                  <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Assignee (optional)</label>
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className={`${inputClasses} appearance-none pr-10`}>
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-10 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                </div>
                <div className="flex flex-col gap-2 relative">
                  <label className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Milestone (optional)</label>
                  <select value={newMilestoneId} onChange={(e) => setNewMilestoneId(e.target.value)} className={`${inputClasses} appearance-none pr-10`}>
                    <option value="">No Milestone</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-10 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <motion.button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-[12px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-colors shadow-sm"
                  whileTap={{ scale: 0.97 }}
                >
                  Create Task
                </motion.button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {msg && <p className="text-[0.9rem] font-medium text-[#e11d48] bg-[#fee2e2] px-4 py-3 rounded-[12px] mb-6">{msg}</p>}

      {loading && tasks.length === 0 ? (
        <div className="flex justify-center py-12 text-[var(--color-text-tertiary)]">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BOARD_COLUMNS.map(({ status, title }) => {
            const col = tasksByStatus[status];
            const statusConfig = STATUSES.find(s => s.value === status)!;
            
            return (
              <section key={status} className="flex flex-col gap-4 p-4 rounded-[24px] bg-black/5 border border-black/5 min-h-[400px]">
                <div className="flex flex-col gap-2 px-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-text-primary)] m-0 flex items-center gap-2">
                      {title}
                      <span className="px-2 py-0.5 rounded-[980px] bg-black/10 text-[0.75rem] font-bold text-[var(--color-text-secondary)]">
                        {col.length}
                      </span>
                    </h3>
                  </div>
                  {isOwner && col.some((t) => selectedIds.has(t.id)) ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem]">
                      <span className="text-[var(--color-text-muted)] mr-1">Selected:</span>
                      {STATUSES.filter((s) => s.value !== status).map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          className="px-2 py-1 rounded-lg bg-black/10 hover:bg-black/15 font-medium"
                          onClick={() => void batchSetStatus(s.value)}
                        >
                          Move to {s.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] font-medium"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 flex-1">
                  <AnimatePresence mode="popLayout">
                    {col.map((t, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
                        key={t.id}
                        className="group relative p-5 rounded-[20px] bg-white border border-black/5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:border-[#81e6d9]/40 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            {isOwner ? (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(t.id)}
                                onChange={() => toggleSelected(t.id)}
                                className="mt-1 rounded border-[var(--color-border)] shrink-0"
                                aria-label={`Select task ${t.title}`}
                              />
                            ) : null}
                            <Link
                              href={`/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(t.id)}`}
                              className="text-[0.95rem] font-semibold text-[var(--color-text-primary)] leading-snug hover:text-[var(--color-primary-hover)] transition-colors"
                            >
                              {t.title}
                            </Link>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => void reorderTask(t.id, "up")} 
                              disabled={index <= 0}
                              className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => void reorderTask(t.id, "down")} 
                              disabled={index >= col.length - 1}
                              className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {t.description && (
                          <p className="text-[0.85rem] text-[var(--color-text-secondary)] leading-[1.47] mb-4 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {t.assigneeName && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-[980px] bg-black/5 text-[0.75rem] font-medium text-[var(--color-text-secondary)]">
                              <User className="w-3 h-3" /> {t.assigneeName}
                            </span>
                          )}
                          {t.milestoneTitle && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-[980px] bg-[#f5ebd4]/40 text-[#d97706] text-[0.75rem] font-medium">
                              <Target className="w-3 h-3" /> {t.milestoneTitle}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-black/5">
                          <div className="relative flex-1 min-w-[100px]">
                            <select
                              value={t.status}
                              onChange={(e) => void patchTask(t.id, { status: e.target.value as TeamTaskStatus })}
                              className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-[8px] text-[0.8rem] font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors ${statusConfig.bg} ${statusConfig.color} hover:brightness-95`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${statusConfig.color}`} />
                          </div>

                          <div className="relative flex-1 min-w-[100px]">
                            <select
                              value={t.assigneeUserId ?? ""}
                              onChange={(e) => void patchTask(t.id, { assigneeUserId: e.target.value === "" ? null : e.target.value })}
                              className="w-full appearance-none pl-3 pr-8 py-1.5 rounded-[8px] bg-black/5 text-[var(--color-text-secondary)] text-[0.8rem] font-medium outline-none cursor-pointer hover:bg-black/10 transition-colors"
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.userId} value={m.userId}>{m.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-[var(--color-text-tertiary)]" />
                          </div>

                          <button 
                            onClick={() => void removeTask(t.id)}
                            className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[#fee2e2] hover:text-[#e11d48] transition-colors"
                            aria-label="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {col.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-black/10 rounded-[20px] opacity-50">
                      <p className="text-[0.85rem] font-medium text-[var(--color-text-tertiary)] text-center">No tasks here</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
