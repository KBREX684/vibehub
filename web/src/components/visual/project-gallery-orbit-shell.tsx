"use client";

import dynamic from "next/dynamic";

import type { ProjectGalleryOrbitProps } from "./project-gallery-orbit";

const ProjectGalleryOrbit = dynamic(
  () => import("./project-gallery-orbit").then((mod) => mod.ProjectGalleryOrbit),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]/70 p-4"
      >
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="w-52 shrink-0 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/80 p-2"
            >
              <div className="aspect-[5/4] rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]/80" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--color-bg-subtle)]/70" />
              <div className="mt-1 h-4 w-3/5 rounded-full bg-[var(--color-bg-subtle)]/50" />
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

export function ProjectGalleryOrbitShell(props: ProjectGalleryOrbitProps) {
  return <ProjectGalleryOrbit {...props} />;
}
