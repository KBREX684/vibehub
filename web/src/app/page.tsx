import { SiteHeader } from "@/components/site-header";
import { ProjectCard } from "@/components/project-card";
import { PostCard } from "@/components/post-card";
import { listPosts, listProjects } from "@/lib/repository";

export default async function HomePage() {
  const [{ items: projects }, { items: posts }] = await Promise.all([
    listProjects({ page: 1, limit: 6 }),
    listPosts({ page: 1, limit: 6 }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container">
        <section className="hero">
          <div className="hero-card">
            <h1>VibeHub 全栈网站 P1 MVP</h1>
            <p>
              讨论广场 + 项目画廊 + Agent 数据层基础能力已贯通，采用统一 /api/v1
              语义和 MCP v1 只读工具接口。
            </p>
          </div>
          <div className="hero-card">
            <div className="metric-grid">
              <div className="metric">
                <strong>{projects.length}</strong>
                <span>示例项目</span>
              </div>
              <div className="metric">
                <strong>{posts.length}</strong>
                <span>示例讨论帖</span>
              </div>
              <div className="metric">
                <strong>v1</strong>
                <span>API 版本</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>项目画廊</h2>
          <div className="grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        <section className="section">
          <h2>讨论广场</h2>
          <div className="grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
