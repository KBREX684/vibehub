"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { formatLocalizedDate } from "@/lib/formatting";
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
  const { language, t } = useLanguage();
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
        setMsg(json.error?.message ?? t("team.milestones.errors.load", "Failed to load milestones"));
        setItems([]);
        return;
      }
      setItems(json.data?.milestones ?? []);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [t, teamSlug]);

  useEffect(() => {
    if (currentUserId) void load();
  }, [currentUserId, load]);

  async function createMilestone(event: FormEvent) {
    event.preventDefault();
    setMsg(null);
    try {
      const [year, month, day] = targetDate.split("-").map(Number);
      const targetIso = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).toISOString();
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
        setMsg(json.error?.message ?? t("team.milestones.errors.create", "Failed to create milestone"));
        return;
      }
      setTitle("");
      setDescription("");
      setTargetDate("");
      setIsFormOpen(false);
      await load();
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
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
        setMsg(json.error?.message ?? t("team.milestones.errors.update", "Failed to update milestone"));
        return;
      }
      await load();
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
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
        setMsg(json.error?.message ?? t("team.milestones.errors.delete", "Failed to delete milestone"));
        return;
      }
      await load();
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
    }
  }

  if (!currentUserId) {
    return (
      <SectionCard
        icon={Target}
        title={t("team.milestones.title", "Milestones")}
        description={t("team.milestones.sign_in_description", "Sign in to view and manage team milestones.")}
      >
        <div className="flex justify-center">
          {isDevDemoAuth() ? (
            <a href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(`/work/team/${teamSlug}?view=milestones`)}`}>
              <Button variant="apple" size="md">
                {t("dev.demo.login_cta", "Demo login")}
              </Button>
            </a>
          ) : (
            <Link href={`/login?redirect=${encodeURIComponent(`/work/team/${teamSlug}?view=milestones`)}`}>
              <Button variant="apple" size="md">
                {t("auth.sign_in", "Sign in")}
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
      title={t("team.milestones.title", "Milestones")}
      actions={
        <Button
          variant={isFormOpen ? "ghost" : "secondary"}
          size="sm"
          onClick={() => setIsFormOpen((value) => !value)}
        >
          <Plus
            className={`w-3.5 h-3.5 transition-transform ${isFormOpen ? "rotate-45" : ""}`}
            aria-hidden="true"
          />
          {isFormOpen
            ? t("common.cancel", "Cancel")
            : t("team.milestones.new", "New milestone")}
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
            onSubmit={(event) => void createMilestone(event)}
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label={t("team.milestones.form.title", "Title")} required>
                  <input
                    className="input-base"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    maxLength={200}
                    placeholder={t("team.milestones.form.title_placeholder", "e.g., MVP launch")}
                  />
                </FormField>
                <FormField label={t("team.milestones.form.target_date", "Target date")} required>
                  <input
                    className="input-base"
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                    required
                  />
                </FormField>
              </div>
              <FormField
                label={t("team.milestones.form.description", "Description")}
                hint={t(
                  "team.milestones.form.description_hint",
                  "What defines success for this milestone?"
                )}
              >
                <textarea
                  className="input-base resize-none"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  maxLength={2000}
                />
              </FormField>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" type="submit">
                  {t("team.milestones.form.submit", "Create milestone")}
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
          title={t("team.milestones.empty_title", "No milestones yet")}
          description={t(
            "team.milestones.empty_description",
            "Add a first milestone to give the team a clear target."
          )}
        />
      ) : (
        <ol className="relative pl-5 md:pl-7 border-l border-[var(--color-border)] space-y-6">
          {items.map((milestone, index) => {
            const isDone = milestone.completed;
            return (
              <motion.li
                key={milestone.id}
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
                        {milestone.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          {t("team.milestones.target", "Target")}{" "}
                          {formatLocalizedDate(milestone.targetDate, language, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span
                          className="inline-block w-1 h-1 rounded-full bg-[var(--color-border-strong)]"
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void patchMilestone(milestone.id, {
                              visibility: milestone.visibility === "public" ? "team_only" : "public",
                            })
                          }
                          className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)] rounded-[var(--radius-pill)]"
                        >
                          <TagPill
                            accent={milestone.visibility === "public" ? "success" : "default"}
                            size="sm"
                          >
                            {milestone.visibility === "public" ? (
                              <Globe className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <Lock className="w-3 h-3" aria-hidden="true" />
                            )}
                            {milestone.visibility === "public"
                              ? t("team.milestones.public", "Public")
                              : t("team.milestones.internal", "Internal")}
                          </TagPill>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start shrink-0">
                      <Button
                        variant={isDone ? "ghost" : "secondary"}
                        size="sm"
                        onClick={() =>
                          void patchMilestone(milestone.id, { completed: !isDone })
                        }
                      >
                        {isDone
                          ? t("team.milestones.reopen", "Reopen")
                          : t("team.milestones.complete", "Complete")}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(milestone)}
                        aria-label={t("team.milestones.delete", "Delete milestone")}
                        className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {milestone.description ? (
                    <p
                      className={`text-sm leading-relaxed mb-4 m-0 ${
                        isDone
                          ? "text-[var(--color-text-tertiary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {milestone.description}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)] font-medium">
                        {t("team.milestones.progress", "Progress")}
                      </span>
                      <span
                        className={`font-mono ${
                          isDone ? "text-[var(--color-success)]" : "text-[var(--color-accent-apple)]"
                        }`}
                      >
                        {milestone.progress}%
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
                          animate={{ width: `${milestone.progress}%` }}
                          transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        />
                      </div>
                      {!isDone ? (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={milestone.progress}
                          onChange={(event) =>
                            void patchMilestone(milestone.id, { progress: Number(event.target.value) })
                          }
                          className="w-24 accent-[var(--color-accent-apple)]"
                          aria-label={t("team.milestones.progress_aria", "Milestone progress")}
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
        title={t("team.milestones.delete_confirm_title", "Delete milestone?")}
        description={
          deleteTarget
            ? t(
                "team.milestones.delete_confirm_description",
                'This will permanently remove "{title}". This action cannot be undone.'
              ).replace("{title}", deleteTarget.title)
            : undefined
        }
        confirmLabel={t("common.delete", "Delete")}
        cancelLabel={t("common.cancel", "Cancel")}
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
