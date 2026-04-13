import { SiteHeader } from "@/components/site-header";
import { ProjectCard } from "@/components/project-card";
import { PostCard } from "@/components/post-card";
import { listPosts, listProjects, listFeaturedProjects } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";

export default async function HomePage() {
  const [{ items: projects }, { items: posts }, featured] = await Promise.all([
    listProjects({ page: 1, limit: 6 }),
    listPosts({ page: 1, limit: 6 }),
    listFeaturedProjects(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container">
        <section className="hero">
          <div className="hero-card">
            <h1>VibeHub</h1>
            <p>
              面向 VibeCoding 开发者的社区广场 — 讨论、展示项目、组建团队，AI 工具直连。
            </p>
            <div style={{ marginTop: 16 }}>
              <SearchBar />
            </div>
          </div>
          <div className="hero-card">
            <div className="metric-grid">
              <div className="metric">
                <strong>{projects.length}</strong>
                <span>项目</span>
              </div>
              <div className="metric">
                <strong>{posts.length}</strong>
                <span>讨论帖</span>
              </div>
              <div className="metric">
                <strong>v1</strong>
                <span>API 版本</span>
              </div>
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="section">
            <h2>✨ 今日精选项目</h2>
            <div className="grid">
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} featured />
              ))}
            </div>
          </section>
        )}

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
