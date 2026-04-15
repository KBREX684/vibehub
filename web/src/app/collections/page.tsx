import Link from "next/link";
import { listCollectionTopics } from "@/lib/repository";
import { Layers, ArrowRight, Hash } from "lucide-react";

export default async function CollectionsIndexPage() {
  const topics = listCollectionTopics();

  return (
    <main className="container pb-24">
      <section className="py-16 md:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] mb-8">
          <Layers className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <span>精选专题集合</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-6 max-w-3xl leading-[1.1]">
          探索 VibeHub 优质内容
        </h1>

        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
          按标签聚合已通过审核的讨论帖与项目橱窗，发现最热门的开发趋势和最佳实践。
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {topics.map((topic) => (
          <article
            key={topic.slug}
            className="card p-7 flex flex-col h-full group relative overflow-hidden"
          >
            <div className="flex flex-col h-full">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center mb-5">
                <Hash className="w-5 h-5 text-[var(--color-accent-cyan)]" />
              </div>

              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-accent-cyan)] transition-colors">
                <Link href={`/collections/${topic.slug}`} className="before:absolute before:inset-0">
                  {topic.title}
                </Link>
              </h2>

              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6 flex-grow">
                {topic.description}
              </p>

              <div className="mt-auto pt-5 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="tag font-mono text-xs">#{topic.tag}</span>
                <div className="flex items-center gap-1 text-[var(--color-accent-cyan)] text-sm font-medium">
                  进入专题 <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
