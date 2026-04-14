import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug, getTeamTaskByIdForSlug } from "@/lib/repository";
import { ArrowLeft, Calendar, Target, User } from "lucide-react";

interface Props {
  params: Promise<{ slug: string; taskId: string }>;
}

export default async function TeamTaskDetailPage({ params }: Props) {
  const { slug, taskId } = await params;
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect(`/api/v1/auth/github?redirect=${encodeURIComponent(`/teams/${slug}/tasks/${taskId}`)}`);
  }

  const team = await getTeamBySlug(slug, session.userId);
  if (!team) notFound();

  const isMember = team.members.some((m) => m.userId === session.userId);
  if (!isMember) {
    redirect(`/teams/${slug}`);
  }

  const task = await getTeamTaskByIdForSlug({
    teamSlug: slug,
    taskId,
    viewerUserId: session.userId,
  });
  if (!task) notFound();

  const statusLabel =
    task.status === "todo" ? "To Do" : task.status === "doing" ? "In Progress" : "Done";

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <Link
        href={`/teams/${encodeURIComponent(slug)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to team
      </Link>

      <article className="card p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag tag-blue text-xs">{statusLabel}</span>
          <span className="text-xs text-[var(--color-text-muted)] font-mono">#{task.id.slice(0, 8)}…</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">{task.title}</h1>
        {task.description ? (
          <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap m-0">{task.description}</p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] m-0">No description.</p>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-[var(--color-border-subtle)] pt-5">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] mb-0.5">Assignee</dt>
              <dd className="text-[var(--color-text-primary)] m-0">{task.assigneeName ?? "Unassigned"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] mb-0.5">Milestone</dt>
              <dd className="text-[var(--color-text-primary)] m-0">{task.milestoneTitle ?? "—"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] mb-0.5">Created by</dt>
              <dd className="text-[var(--color-text-primary)] m-0">
                {task.createdByName}{" "}
                <span className="text-[var(--color-text-muted)]">
                  · updated {new Date(task.updatedAt).toLocaleString()}
                </span>
              </dd>
            </div>
          </div>
        </dl>
      </article>
    </main>
  );
}
