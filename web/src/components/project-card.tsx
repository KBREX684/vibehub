import Link from "next/link";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card">
      <div className="meta-row">
        <span className="status">{project.status}</span>
        <span className="muted">{new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>
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
