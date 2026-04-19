import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="container py-20 text-center max-w-lg mx-auto">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">项目</p>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">未找到项目</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        这个项目不存在，或已被移除。
      </p>
      <Link href="/discover" className="btn btn-primary px-6 py-2.5 text-sm font-semibold inline-block">
        浏览项目
      </Link>
    </div>
  );
}
