import Link from "next/link";
import type { Project } from "@/lib/types";
import { ArrowRight, Users } from "lucide-react";

export function ProjectCard({ project }: { project: Project }) {
  const statusColors: Record<string, string> = {
    idea: "bg-stone-100 text-stone-600",
    building: "bg-blue-50 text-blue-600",
    launched: "bg-emerald-50 text-emerald-600",
    paused: "bg-red-50 text-red-600",
  };

  const statusColor = statusColors[project.status] || "bg-stone-100 text-stone-600";

  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${statusColor}`}>
          {project.status}
        </span>
        <span className="text-xs text-stone-400 font-medium">
          {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
        </span>
      </div>

      <h3 className="text-xl font-bold text-stone-900 mb-2 leading-tight group-hover:text-amber-600 transition-colors">
        <Link href={`/projects/${project.slug}`} className="before:absolute before:inset-0">
          {project.title}
        </Link>
      </h3>

      {project.team && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-3 relative z-10">
          <Users className="w-3.5 h-3.5" />
          <Link href={`/teams/${encodeURIComponent(project.team.slug)}`} className="hover:text-amber-600 transition-colors">
            {project.team.name}
          </Link>
        </div>
      )}

      <p className="text-stone-600 text-sm leading-relaxed mb-6 line-clamp-2">
        {project.oneLiner}
      </p>

      <div className="mt-auto pt-4 border-t border-stone-100 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={`${project.id}-${tag}`} className="text-xs font-medium px-2 py-1 bg-stone-50 text-stone-600 rounded-md">
              #{tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-xs font-medium px-2 py-1 text-stone-400">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex items-center text-amber-600 text-sm font-semibold group-hover:gap-2 transition-all">
          查看详情 <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </article>
  );
}
