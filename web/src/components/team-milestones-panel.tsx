"use client";

/**
 * v8 W2 — migrated off the legacy palette (white glass / emerald green / amber
 * / fee2e2 red chips) to tokenized primitives.
 *
 * Structure preserved: milestone list with inline "New milestone" form,
 * progress slider, visibility toggle, reopen/complete/delete actions.
 * What changed is only how each surface is rendered:
 *   - Section wrapper → SectionCard
 *   - Sign-in state → SectionCard + Button
 *   - Timeline items → token-driven cards on dark surfaces
 *   - Empty state → EmptyState primitive
 *   - Delete confirm → ConfirmDialog
 *   - Error banner → token-driven inline callout
 */

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { motion, AnimatePresence } from "framer-motion";
import type { TeamMilestone } from "@/lib/types";
import {
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  FormField,
  LoadingSkeleton,
  SectionCard,
  TagPill,
} from "@/components/ui";

const TIMELINE_NODE_CLASS =
  "absolute -left-[26px] md:-left-[34px] top-1 w-5 h-5 rounded-full bg-[var(--color-bg-canvas)] border border-[var(--color-border-strong)] flex items-center justify-center";

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
  const [deleteTarget, setDeleteTarget] = useState<TeamMilestone | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/milestones`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { milestones?: TeamMilestone[] };
        error?: { message?: string };
      };
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
    if (currentUserId) void load();
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
      if (description.trim()) body.description = description.trim();
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

  async function performDelete(id: string) {
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
      <SectionCard
        icon={Target}
        title="Milestones"
        description="Log in to view and manage team milestones."
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
      icon={Target}
      title="Milestones"
      actions={
        <Button
          variant={isFormOpen ? "ghost" : "secondary"}
          size="sm"
          onClick={() => setIsFormOpen((v) => !v)}
        >
          <Plus
            className={`w-3.5 h-3.5 transition-transform ${isFormOpen ? "rotate-45" : ""}`}
            aria-hidden="true"
          />
          {isFormOpen ? "Cancel" : "New milestone"}
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
            onSubmit={(ev) => void createMilestone(ev)}
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Title" required>
                  <input
                    className="input-base"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="e.g., MVP Launch"
                  />
                </FormField>
                <FormField label="Target date" required>
                  <input
                    className="input-base"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                  />
                </FormField>
              </div>
              <FormField label="Description" hint="What defines success for this milestone?">
                <textarea
                  className="input-base resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={2000}
                />
              </FormField>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" type="submit">
                  Create milestone
                </Button>
              </div>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {msg ? <ErrorBanner className="mb-4">{msg}</ErrorBanner> : null}

      {loading && items.length === 0 ? (
        <LoadingSkeleton preset="list" count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No milestones yet"
          description="Add a first milestone to give the team a clear target."
        />
      ) : (
        <ol className="relative pl-5 md:pl-7 border-l border-[var(--color-border)] space-y-6">
          {items.map((m, index) => {
            const isDone = m.completed;
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.05 }}
                className="relative"
              >
                <span className={TIMELINE_NODE_CLASS} aria-hidden="true">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[var(--color-accent-apple)]" />
                  )}
                </span>

                <div
                  className={[
                    "rounded-[var(--radius-lg)] border p-4 transition-colors",
                    isDone
                      ? "bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] opacity-80"
                      : "bg-[var(--color-bg-elevated)] border-[var(--color-border)]",
                  ].join(" ")}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3
                        className={`text-sm font-semibold tracking-tight mb-1 m-0 ${
                          isDone
                            ? "text-[var(--color-text-secondary)] line-through"
                            : "text-[var(--color-text-primary)]"
                        }`}
                      >
                        {m.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          Target:{" "}
                          {new Date(m.targetDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="inline-block w-1 h-1 rounded-full bg-[var(--color-border-strong)]" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() =>
                            void patchMilestone(m.id, {
                              visibility: m.visibility === "public" ? "team_only" : "public",
                            })
                          }
                          className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)] rounded-[var(--radius-pill)]"
                        >
                          <TagPill accent={m.visibility === "public" ? "success" : "default"} size="sm">
                            {m.visibility === "public" ? (
                              <Globe className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <Lock className="w-3 h-3" aria-hidden="true" />
                            )}
                            {m.visibility === "public" ? "Public" : "Internal"}
                          </TagPill>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start shrink-0">
                      <Button
                        variant={isDone ? "ghost" : "secondary"}
                        size="sm"
                        onClick={() => void patchMilestone(m.id, { completed: !isDone })}
                      >
                        {isDone ? "Reopen" : "Complete"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        aria-label="Delete milestone"
                        className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {m.description ? (
                    <p
                      className={`text-sm leading-relaxed mb-4 m-0 ${
                        isDone
                          ? "text-[var(--color-text-tertiary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {m.description}
                    </p>
                  ) : null}

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)] font-medium">Progress</span>
                      <span
                        className={`font-mono ${
                          isDone ? "text-[var(--color-success)]" : "text-[var(--color-accent-apple)]"
                        }`}
                      >
                        {m.progress}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: isDone
                              ? "var(--color-success)"
                              : "var(--color-accent-apple)",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${m.progress}%` }}
                          transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        />
                      </div>
                      {!isDone ? (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={m.progress}
                          onChange={(e) =>
                            void patchMilestone(m.id, { progress: Number(e.target.value) })
                          }
                          className="w-24 accent-[var(--color-accent-apple)]"
                          aria-label="Milestone progress"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete milestone?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.title}". This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="destructive"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await performDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </SectionCard>
  );
}
