import { SiteHeader } from "@/components/site-header";
import { unifiedSearch } from "@/lib/repository";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string; type?: string }>;
}

const TYPE_LABELS: Record<string, string> = { post: "帖子", project: "项目", creator: "创作者" };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", type } = await searchParams;
  const validTypes = ["post", "project", "creator"] as const;
  type SearchType = typeof validTypes[number];
  const resolvedType = validTypes.includes(type as SearchType) ? (type as SearchType) : undefined;

  const results = q.trim().length >= 2 ? await unifiedSearch(q.trim(), resolvedType) : [];

  return (
    <>
      <SiteHeader />
      <main className="container">
        <section className="section">
          <h1 style={{ marginBottom: 8 }}>搜索结果</h1>
          {q ? (
            <p className="muted">
              关键词：<strong>&ldquo;{q}&rdquo;</strong>
              {resolvedType ? ` · 类型：${TYPE_LABELS[resolvedType]}` : ""}
              {" · "}共 {results.length} 条结果
            </p>
          ) : (
            <p className="muted">请在首页搜索栏输入关键词后回车。</p>
          )}

          <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
            <Link href={`/search?q=${encodeURIComponent(q)}`} className={`button ghost ${!resolvedType ? "active-filter" : ""}`}>全部</Link>
            {validTypes.map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(q)}&type=${t}`} className={`button ghost ${resolvedType === t ? "active-filter" : ""}`}>
                {TYPE_LABELS[t]}
              </Link>
            ))}
          </div>

          {results.length === 0 && q.trim().length >= 2 ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <p className="muted">没有找到与 &ldquo;{q}&rdquo; 相关的内容。</p>
            </div>
          ) : (
            <div className="admin-list">
              {results.map((item) => (
                <article key={`${item.type}-${item.id}`} className="card">
                  <div className="meta-row">
                    <div>
                      <span className="tag" style={{ marginRight: 8 }}>{TYPE_LABELS[item.type]}</span>
                      <Link href={`/${item.type === "post" ? "discussions" : item.type === "creator" ? "creators" : "projects"}/${item.slug}`} className="inline-link">
                        {item.title}
                      </Link>
                    </div>
                  </div>
                  <p className="muted small" style={{ marginTop: 4 }}>{item.excerpt}</p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="tag-row" style={{ marginTop: 8 }}>
                      {item.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
