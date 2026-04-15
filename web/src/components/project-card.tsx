"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, GitFork, Zap, Users } from "lucide-react";
import type { Project } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  idea: "tag-violet",
  building: "tag-blue",
  launched: "tag-green",
  paused: "tag",
};

export function ProjectCard({
  project,
  featured,
}: {
  project: Project;
  featured?: boolean;
}) {
  return (
    <article className="relative group card transition-colors overflow-hidden">
      {featured && (
        <div className="absolute inset-0 border-2 border-[var(--color-text-primary)] pointer-events-none rounded-[var(--radius-lg)]" />
      )}

      <Link
        href={`/projects/${project.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`View ${project.title}`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {project.logoUrl ? (
            <div className="w-10 h-10 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0 border border-[var(--color-border)]">
              <Image
                src={project.logoUrl}
                alt={`${project.title} logo`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 text-base font-mono font-bold text-[var(--color-text-primary)]">
              {project.title.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight truncate">
                {project.title}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {featured && (
                  <span className="tag tag-yellow flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    Featured
                  </span>
                )}
                <span className={`tag ${STATUS_COLORS[project.status] ?? "tag"} capitalize`}>
                  {project.status}
                </span>
              </div>
            </div>
            {project.team && (
              <div className="flex items-center gap-1 mt-0.5">
                <Users className="w-3 h-3 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {project.team.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* One-liner */}
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3">
          {project.oneLiner}
        </p>

        {/* Screenshot */}
        {project.screenshots?.[0] && (
          <div className="w-full h-28 mb-3 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <Image
              src={project.screenshots[0]}
              alt="Project preview"
              width={400}
              height={112}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
          <div className="tag-row">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] shrink-0">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {project.techStack?.length ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              {project.screenshots?.length ?? 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
