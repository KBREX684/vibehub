"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { motion, AnimatePresence } from "framer-motion";
import type { TeamMember, TeamMilestone, TeamRole, TeamTask, TeamTaskStatus } from "@/lib/types";
import {
  KanbanSquare,
  Plus,
  User,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Target,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Button,
  ConfirmDialog,
  ErrorBanner,
  FormField,
  LoadingSkeleton,
  SectionCard,
  TagPill,
} from "@/components/ui";
import type { TagPillAccent } from "@/components/ui";

interface Props {
  teamSlug: string;
  members: TeamMember[];
  milestones: TeamMilestone[];
  currentUserId: string | null;
  viewerRole?: TeamRole;
}

const STATUSES: {
  value: TeamTaskStatus;
  label: string;
  accent: TagPillAccent;
}[] = [
  { value: "todo", label: "To Do", accent: "default" },
  { value: "doing", label: "In Progress", accent: "cyan" },
  { value: "review", label: "In Review", accent: "warning" },
  { value: "done", label: "Done", accent: "success" },
  { value: "rejected", label: "Rejected", accent: "error" },
];

const BOARD_COLUMNS: { status: TeamTaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "doing", title: "In Progress" },
  { status: "review", title: "In Review" },
  { status: "done", title: "Done" },
  { status: "rejected", title: "Rejected" },
];

function sortTasksForColumn(rows: TeamTask[]): TeamTask[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
}

/** Shared classname for inline <select> controls inside task cards. */
const INLINE_SELECT_CLASS =
  "w-full appearance-none pl-2 pr-6 py-1 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] outline-none cursor-pointer hover:border-[var(--color-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)]";

/** Task title link — heavy a11y focus-ring kept in one place. */
const TASK_TITLE_LINK_CLASS =
  "text-sm font-semibold text-[var(--color-text-primary)] leading-snug hover:text-[var(--color-accent-apple)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)] rounded-[var(--radius-sm)]";

/** Kanban card surface with hover states. */
const TASK_CARD_CLASS =
  "group relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface-hover)] transition-colors";

export function TeamTasksPanel({ teamSlug, members, milestones, currentUserId, viewerRole }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newMilestoneId, setNewMilestoneId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamTask | null>(null);
  const canReview = viewerRole === "owner" || viewerRole === "admin" || viewerRole === "reviewer";
  const currentMember = members.find((member) => member.userId === currentUserId) ?? null;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tasksByStatus = useMemo(() => {
    const map: Record<TeamTaskStatus, TeamTask[]> = { todo: [], doing: [], review: [], done: [], rejected: [] };
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
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks`, {
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

  async function submitCreateTask() {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    setMsg(null);
    const optimisticId = `tmp-task-${Date.now()}`;
    const assignee = members.find((member) => member.userId === newAssignee) ?? null;
    const milestone = milestones.find((item) => item.id === newMilestoneId) ?? null;
    const now = new Date().toISOString();
    const optimisticTask: TeamTask = {
      id: optimisticId,
      teamId: teamSlug,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      status: "todo",
      sortOrder: tasksByStatus.todo.length ? Math.max(...tasksByStatus.todo.map((task) => task.sortOrder)) + 1 : 0,
      milestoneId: milestone?.id,
      milestoneTitle: milestone?.title,
      createdByUserId: currentUserId ?? "unknown",
      createdByName: currentMember?.name ?? "You",
      assigneeUserId: assignee?.userId,
      assigneeName: assignee?.name,
      assigneeEmail: assignee?.email,
      createdAt: now,
      updatedAt: now,
    };
    setTasks((prev) => sortTasksForColumn([...prev, optimisticTask]));
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
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: TeamTask; error?: { message?: string } };
      if (!res.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== optimisticId));
        setMsg(json.error?.message ?? "Create failed");
        return;
      }
      const createdTask = json.data;
      setNewTitle("");
      setNewDesc("");
      setNewAssignee("");
      setNewMilestoneId("");
      setIsFormOpen(false);
      if (createdTask) {
        setTasks((prev) => sortTasksForColumn(prev.map((task) => (task.id === optimisticId ? createdTask : task))));
      } else {
        await load();
      }
    } catch (err) {
      setTasks((prev) => prev.filter((task) => task.id !== optimisticId));
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  function createTask(e: FormEvent) {
    e.preventDefault();
    void submitCreateTask();
  }

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    setMsg(null);
    try {
      // Optimistic Update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } as TeamTask : t));

      const res = await apiFetch(
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
      const res = await apiFetch(
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
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/batch`, {
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

  async function performRemoveTask(taskId: string) {
    setMsg(null);
    try {
      const res = await apiFetch(
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
      <SectionCard
        icon={KanbanSquare}
        title="Task board"
        description="Log in to view and manage team tasks."
      >
        <div className="flex justify-center">
          {isDevDemoAuth() ? (
            <a href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(`/teams/${teamSlug}`)}`}>
              <Button variant="apple" size="md">
                Demo login
              </Button>
            </a>
          ) : (
            <Link href={`/login?redirect=${encodeURIComponent(`/teams/${teamSlug}`)}`}>
              <Button variant="apple" size="md">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={KanbanSquare}
      title="Task board"
      description="Kanban across To Do, In Progress, In Review, Done and Rejected."
      actions={
        <Button
          variant={isFormOpen ? "ghost" : "primary"}
          size="sm"
          onClick={() => setIsFormOpen((v) => !v)}
        >
          <Plus
            className={`w-3.5 h-3.5 transition-transform ${isFormOpen ? "rotate-45" : ""}`}
            aria-hidden="true"
          />
          {isFormOpen ? "Cancel" : "New task"}
        </Button>
      }
    >
      <AnimatePresence>
        {isFormOpen ? (
          <motion.form
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
            onSubmit={(ev) => void createTask(ev)}
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <FormField htmlFor="team-task-title" label="Task title" required>
                <input
                  id="team-task-title"
                  className="input-base"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  maxLength={200}
                  disabled={!isHydrated}
                  placeholder="e.g., Design new landing page"
                />
              </FormField>
              <FormField htmlFor="team-task-description" label="Description">
                <textarea
                  id="team-task-description"
                  className="input-base resize-none"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  disabled={!isHydrated}
                  placeholder="Add more details..."
                />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField htmlFor="team-task-assignee" label="Assignee">
                  <select
                    id="team-task-assignee"
                    className="input-base"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    disabled={!isHydrated}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField htmlFor="team-task-milestone" label="Milestone">
                  <select
                    id="team-task-milestone"
                    className="input-base"
                    value={newMilestoneId}
                    onChange={(e) => setNewMilestoneId(e.target.value)}
                    disabled={!isHydrated}
                  >
                    <option value="">No milestone</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="team-task-create-submit"
                  disabled={!isHydrated || creating || !newTitle.trim()}
                  onClick={() => void submitCreateTask()}
                  loading={creating}
                >
                  {creating ? "Creating…" : "Create task"}
                </Button>
              </div>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {msg ? <ErrorBanner className="mb-4">{msg}</ErrorBanner> : null}

      {loading && tasks.length === 0 ? (
        <LoadingSkeleton preset="card-grid" count={6} columns={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BOARD_COLUMNS.map(({ status, title }) => {
            const col = tasksByStatus[status];
            const statusConfig = STATUSES.find((s) => s.value === status)!;

            return (
              <section
                key={status}
                className="flex flex-col gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] min-h-[320px]"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)] m-0 flex items-center gap-2">
                    {title}
                    <TagPill accent="default" size="sm" mono>
                      {col.length}
                    </TagPill>
                  </h3>
                </div>

                {canReview && col.some((t) => selectedIds.has(t.id)) ? (
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    <span className="text-[11px] text-[var(--color-text-muted)] mr-1">Selected:</span>
                    {STATUSES.filter((s) => s.value !== status).map((s) => (
                      <Button
                        key={s.value}
                        variant="ghost"
                        size="sm"
                        onClick={() => void batchSetStatus(s.value)}
                      >
                        Move to {s.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 flex-1">
                  <AnimatePresence mode="popLayout">
                    {col.map((t, index) => (
                      <motion.article
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        key={t.id}
                        className={TASK_CARD_CLASS}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            {canReview ? (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(t.id)}
                                onChange={() => toggleSelected(t.id)}
                                className="mt-1 accent-[var(--color-accent-apple)] shrink-0"
                                aria-label={`Select task ${t.title}`}
                              />
                            ) : null}
                            <Link
                              href={`/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(t.id)}`}
                              className={TASK_TITLE_LINK_CLASS}
                            >
                              {t.title}
                            </Link>
                          </div>
                          <div className="flex flex-col gap-1 opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => void reorderTask(t.id, "up")}
                              disabled={index <= 0}
                              aria-label="Move up"
                              className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowUp className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void reorderTask(t.id, "down")}
                              disabled={index >= col.length - 1}
                              aria-label="Move down"
                              className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowDown className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {t.description ? (
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-3 line-clamp-2 m-0">
                            {t.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          {t.assigneeName ? (
                            <TagPill accent="default" size="sm">
                              <User className="w-3 h-3" aria-hidden="true" />
                              {t.assigneeName}
                            </TagPill>
                          ) : null}
                          {t.milestoneTitle ? (
                            <TagPill accent="warning" size="sm">
                              <Target className="w-3 h-3" aria-hidden="true" />
                              {t.milestoneTitle}
                            </TagPill>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                          <TagPill accent={statusConfig.accent} size="sm" mono>
                            {statusConfig.label}
                          </TagPill>
                          <div className="relative flex-1 min-w-[100px]">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                void patchTask(t.id, { status: e.target.value as TeamTaskStatus })
                              }
                              aria-label="Change status"
                              className={INLINE_SELECT_CLASS}
                            >
                              {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[var(--color-text-tertiary)]"
                              aria-hidden="true"
                            />
                          </div>

                          <div className="relative flex-1 min-w-[100px]">
                            <select
                              value={t.assigneeUserId ?? ""}
                              onChange={(e) =>
                                void patchTask(t.id, {
                                  assigneeUserId: e.target.value === "" ? null : e.target.value,
                                })
                              }
                              aria-label="Change assignee"
                              className={INLINE_SELECT_CLASS}
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[var(--color-text-tertiary)]"
                              aria-hidden="true"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            aria-label="Delete task"
                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>

                  {col.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)]">
                      <p className="text-xs text-[var(--color-text-muted)] text-center m-0">
                        No tasks here
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete task?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.title}". This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="destructive"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await performRemoveTask(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </SectionCard>
  );
}
