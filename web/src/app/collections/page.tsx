import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listCollectionTopics } from "@/lib/repository";

export default async function CollectionsIndexPage() {
  const topics = listCollectionTopics();

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>专题集合</h1>
        <p className="muted">
          P2-3：按标签聚合已通过审核的讨论帖与项目橱窗，便于发现与运营复盘。公开接口：{" "}
          <code className="code-inline">GET /api/v1/collection-topics</code>
        </p>

        <div className="grid">
          {topics.map((topic) => (
            <article key={topic.slug} className="card">
              <h2>{topic.title}</h2>
              <p className="muted">{topic.description}</p>
              <p>
                <span className="tag">#{topic.tag}</span>
              </p>
              <Link href={`/collections/${topic.slug}`} className="inline-link">
                进入专题
              </Link>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
