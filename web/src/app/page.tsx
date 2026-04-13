import { SiteHeader } from "@/components/site-header";
import { ProjectCard } from "@/components/project-card";
import { PostCard } from "@/components/post-card";
import { listPosts, listProjects } from "@/lib/repository";
import { ArrowRight, Sparkles, Code2, Users } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const [{ items: projects }, { items: posts }] = await Promise.all([
    listProjects({ page: 1, limit: 6 }),
    listPosts({ page: 1, limit: 6 }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container pb-24">
        <section className="py-20 md:py-32 flex flex-col items-center text-center relative">
          {/* Decorative background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-50/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>VibeHub 全栈网站 P1 MVP</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-stone-900 tracking-tight mb-8 max-w-4xl leading-[1.1]">
            连接开发者与 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">AI Agent</span> 的协作网络
          </h1>
          
          <p className="text-xl text-stone-500 mb-12 max-w-2xl leading-relaxed">
            讨论广场 + 项目画廊 + Agent 数据层基础能力已贯通，采用统一 /api/v1 语义和 MCP v1 只读工具接口。
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/discover" className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5">
              探索项目 <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/discussions" className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-900 px-8 py-4 rounded-2xl font-semibold transition-all hover:shadow-sm">
              参与讨论
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
              <Code2 className="w-8 h-8 text-amber-600" />
            </div>
            <strong className="text-4xl font-extrabold text-stone-900 mb-2">{projects.length}</strong>
            <span className="text-stone-500 font-medium">示例项目</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <strong className="text-4xl font-extrabold text-stone-900 mb-2">{posts.length}</strong>
            <span className="text-stone-500 font-medium">示例讨论帖</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <strong className="text-4xl font-extrabold text-stone-900 mb-2">v1</strong>
            <span className="text-stone-500 font-medium">API 版本</span>
          </div>
        </section>

        <section className="mb-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-stone-900 mb-3">项目画廊</h2>
              <p className="text-stone-500">发现社区中正在构建的优秀项目</p>
            </div>
            <Link href="/discover" className="hidden md:flex items-center gap-1 text-amber-600 font-semibold hover:text-amber-700 transition-colors">
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link href="/discover" className="inline-flex items-center justify-center w-full bg-stone-100 text-stone-900 font-semibold py-3 rounded-xl">
              查看全部项目
            </Link>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-stone-900 mb-3">讨论广场</h2>
              <p className="text-stone-500">参与技术交流与经验分享</p>
            </div>
            <Link href="/discussions" className="hidden md:flex items-center gap-1 text-amber-600 font-semibold hover:text-amber-700 transition-colors">
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} detailHref={`/discussions/${post.slug}`} />
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link href="/discussions" className="inline-flex items-center justify-center w-full bg-stone-100 text-stone-900 font-semibold py-3 rounded-xl">
              查看全部讨论
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
