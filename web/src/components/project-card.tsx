"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Project } from "@/lib/types";
import { Sparkles, ExternalLink } from "lucide-react";

export function ProjectCard({ project, featured }: { project: Project; featured?: boolean }) {
  return (
    <motion.article 
      className="relative flex flex-col h-full bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] rounded-[24px] p-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer"
      whileHover={{ y: -4, scale: 1.01, boxShadow: "0 16px 48px -8px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Featured Glow Background */}
      {featured && (
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#f5ebd4] rounded-full blur-[64px] opacity-20 pointer-events-none" />
      )}

      <Link href={`/projects/${project.slug}`} className="absolute inset-0 z-10" aria-label={`View ${project.title}`} />

      <div className="relative z-20 flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {project.logoUrl ? (
            <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-black/5 flex-shrink-0">
              <Image 
                src={project.logoUrl} 
                alt={`${project.title} logo`} 
                width={48} 
                height={48} 
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-[12px] bg-black/5 flex items-center justify-center flex-shrink-0 text-xl font-bold text-[var(--color-text-tertiary)]">
              {project.title.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)] leading-tight m-0">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {project.status}
              </span>
              {featured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#f5ebd4] bg-[#f5ebd4]/10 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.47] mb-6 flex-grow line-clamp-2">
        {project.oneLiner}
      </p>

      {project.screenshots && project.screenshots.length > 0 && (
        <div className="w-full h-32 mb-6 rounded-[16px] overflow-hidden bg-black/5">
          <Image 
            src={project.screenshots[0]} 
            alt="Project preview" 
            width={400} 
            height={200}
            unoptimized
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5 relative z-20">
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 2).map((tag) => (
            <span key={`${project.id}-${tag}`} className="text-[11px] font-medium px-2.5 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
              {tag}
            </span>
          ))}
          {project.tags.length > 2 && (
            <span className="text-[11px] font-medium px-2 py-1 text-[var(--color-text-tertiary)]">
              +{project.tags.length - 2}
            </span>
          )}
        </div>

        {project.team && (
          <Link 
            href={`/teams/${encodeURIComponent(project.team.slug)}`}
            className="text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent-apple)] transition-colors flex items-center gap-1 z-20 relative"
          >
            {project.team.name}
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}
