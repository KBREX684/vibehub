import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listCollectionTopics } from "@/lib/repository";
import { Layers, ArrowRight, Hash } from "lucide-react";

export default async function CollectionsIndexPage() {
  const topics = listCollectionTopics();

  return (
    <>
      <SiteHeader />
      <main className="container pb-24">
        <section className="py-16 md:py-24 flex flex-col items-center text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-50/80 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 mb-8 shadow-sm">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>精选专题集合</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-6 max-w-3xl leading-[1.1]">
            探索 VibeHub <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">优质内容</span>
          </h1>
          
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed">
            按标签聚合已通过审核的讨论帖与项目橱窗，发现最热门的开发趋势和最佳实践。
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {topics.map((topic) => (
            <article 
              key={topic.slug} 
              className="bg-white border border-stone-200 rounded-3xl p-8 flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-stone-50 rounded-full group-hover:bg-amber-50 transition-colors duration-500"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 group-hover:bg-amber-100 flex items-center justify-center mb-6 transition-colors duration-300">
                  <Hash className="w-6 h-6 text-stone-400 group-hover:text-amber-600 transition-colors duration-300" />
                </div>
                
                <h2 className="text-2xl font-bold text-stone-900 mb-3 group-hover:text-amber-600 transition-colors">
                  <Link href={`/collections/${topic.slug}`} className="before:absolute before:inset-0">
                    {topic.title}
                  </Link>
                </h2>
                
                <p className="text-stone-500 text-base leading-relaxed mb-8 flex-grow">
                  {topic.description}
                </p>
                
                <div className="mt-auto pt-6 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg">
                    #{topic.tag}
                  </span>
                  
                  <div className="flex items-center text-amber-600 text-sm font-semibold group-hover:gap-2 transition-all">
                    进入专题 <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
