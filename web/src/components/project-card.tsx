import Link from "next/link";
import type { Project } from "@/lib/types";

export function ProjectCard({ project, featured }: { project: Project; featured?: boolean }) {
  return (
    <article className="card" style={featured ? { borderColor: "#f59e0b", borderWidth: 2 } : undefined}>
      <div className="meta-row">
        <span className="status">{project.status}</span>
        {featured ? <span className="tag" style={{ background: "#fef3c7", color: "#92400e" }}>✨ 今日精选</span> : null}
        <span className="muted">{new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>
      {project.team ? (
        <p className="muted small">
          团队：{" "}
          <Link href={`/teams/${encodeURIComponent(project.team.slug)}`} className="inline-link">
            {project.team.name}
          </Link>
        </p>
      ) : null}
      <h3>{project.title}</h3>
      <p>{project.oneLiner}</p>
      <div className="tag-row">
        {project.tags.map((tag) => (
          <span className="tag" key={`${project.id}-${tag}`}>
            #{tag}
          </span>
        ))}
      </div>
      <Link href={`/projects/${project.slug}`} className="inline-link">
        查看项目详情
      </Link>
    </article>
  );
}
