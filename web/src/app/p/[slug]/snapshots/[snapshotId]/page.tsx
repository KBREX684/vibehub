import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FolderArchive, GitBranch } from "lucide-react";
import { getServerLanguage } from "@/lib/i18n";
import { formatLocalizedDate } from "@/lib/formatting";
import { getPublicSnapshotForProject } from "@/lib/repositories/workspace.repository";
import { Badge, SectionCard, TagPill } from "@/components/ui";

interface Props {
  params: Promise<{ slug: string; snapshotId: string }>;
}

export default async function PublicProjectSnapshotPage({ params }: Props) {
  const { slug, snapshotId } = await params;
  const language = await getServerLanguage();
  const payload = await getPublicSnapshotForProject({ projectSlug: slug, snapshotId });

  if (!payload) {
    notFound();
  }

  const { project, snapshot } = payload;

  return (
    <main className="container pb-24 pt-6 space-y-6">
      <Link
        href={`/p/${encodeURIComponent(project.slug)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to project
      </Link>

      <SectionCard
        title={snapshot.title}
        description={`${project.title} snapshot capsule`}
        icon={FolderArchive}
        actions={
          snapshot.previousSnapshotTitle ? (
            <Badge variant="default" pill mono size="sm">
              from {snapshot.previousSnapshotTitle}
            </Badge>
          ) : (
            <Badge variant="cyan" pill mono size="sm">
              root snapshot
            </Badge>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5" />
              {formatLocalizedDate(snapshot.createdAt, language, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              })}
            </span>
            <span>Created by {snapshot.createdByName ?? "Unknown"}</span>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              Summary
            </div>
            <p className="mb-0 mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {snapshot.summary}
            </p>
          </div>

          {snapshot.goal ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                Goal
              </div>
              <p className="mb-0 mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {snapshot.goal}
              </p>
            </div>
          ) : null}

          {snapshot.roleNotes ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                Role notes
              </div>
              <p className="mb-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {snapshot.roleNotes}
              </p>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              <GitBranch className="w-3.5 h-3.5" />
              Included projects
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.projects.map((item) => (
                <Link
                  key={item.id}
                  href={`/p/${encodeURIComponent(item.slug)}`}
                  className="hover:opacity-90"
                >
                  <TagPill mono size="sm" accent={item.openSource ? "success" : "default"}>
                    {item.title}
                  </TagPill>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
