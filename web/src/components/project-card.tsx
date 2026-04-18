"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Zap, Users, Flame, Clock3, TrendingUp } from "lucide-react";
import type { Project } from "@/lib/types";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDate } from "@/lib/formatting";
import { Badge, SpotlightCard, TiltedCard } from "@/components/ui";

const PROJECT_INITIAL_CLASS =
  "w-10 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 text-base font-mono font-bold text-[var(--color-text-primary)]";

export function ProjectCard({
  project,
  featured,
}: {
  project: Project;
  featured?: boolean;
}) {
  const { language, t } = useLanguage();
  const updatedLabel = formatLocalizedDate(project.updatedAt, language, { month: "short", day: "numeric" });

  const cardContent = (
    <SpotlightCard
      className="relative group card transition-colors overflow-hidden"
      spotlightColor={featured ? "var(--color-spotlight-violet)" : "var(--color-spotlight-default)"}
      spotlightRadius={featured ? 240 : 180}
    >
      {featured && (
        <>
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[var(--color-featured-highlight)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] shadow-[inset_0_0_0_1px_var(--color-featured-highlight)]" />
        </>
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
            <div className={PROJECT_INITIAL_CLASS}>
              {project.title.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)] leading-tight">
                {project.title}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {featured && (
                  <Badge variant="warning" pill mono size="sm">
                    <Zap className="w-2.5 h-2.5" />
                    {t("project.featured", "Featured")}
                  </Badge>
                )}
                <Badge
                  variant={
                    project.status === "idea"
                      ? "violet"
                      : project.status === "building"
                        ? "info"
                        : project.status === "launched"
                          ? "success"
                          : "default"
                  }
                  pill
                  mono
                  size="sm"
                  className="capitalize"
                >
                  {t(`project.status.${project.status}`, project.status)}
                </Badge>
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
          <div className="flex flex-wrap items-center gap-2">
            {project.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" pill mono size="sm">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] shrink-0">
            {typeof project.activityScore === "number" && project.activityScore > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {Math.round(project.activityScore)}
              </span>
            )}
            {typeof project.bookmarkCount === "number" && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {project.bookmarkCount}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {project.collaborationIntentCount ?? 0}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            {t("common.updated", "Updated")} {updatedLabel}
          </span>
          {typeof project.recentBookmarkDelta === "number" && project.recentBookmarkDelta > 0 ? (
            <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
              <TrendingUp className="w-3 h-3" />
              {t("project.saves_this_week", "+{count} saves this week").replace("{count}", String(project.recentBookmarkDelta))}
            </span>
          ) : null}
        </div>
      </div>
    </SpotlightCard>
  );

  if (featured) {
    return (
      <TiltedCard className="block">
        {cardContent}
      </TiltedCard>
    );
  }

  return cardContent;
}
