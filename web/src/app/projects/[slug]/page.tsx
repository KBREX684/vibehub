import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getProjectBySlug } from "@/lib/repository";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const mcpToolExample = {
    tool: "get_project_detail",
    input: { slug: project.slug },
  };

  return (
    <>
      <SiteHeader />
      <main className="container detail">
        <article className="card">
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <div className="tag-row">
            {project.techStack.map((tech) => (
              <span key={`${project.id}-${tech}`} className="tag">
                {tech}
              </span>
            ))}
          </div>
          {project.demoUrl ? (
            <p>
              Demo:{" "}
              <a href={project.demoUrl} target="_blank" rel="noreferrer" className="inline-link">
                {project.demoUrl}
              </a>
            </p>
          ) : null}
        </article>

        <aside className="card">
          <h3>Agent 调用示例</h3>
          <pre className="code">{JSON.stringify(mcpToolExample, null, 2)}</pre>
          <p className="muted">
            对应接口：<code>/api/v1/mcp/get_project_detail?slug={project.slug}</code>
          </p>
          <Link href="/" className="inline-link">
            返回首页
          </Link>
        </aside>
      </main>
    </>
  );
}
