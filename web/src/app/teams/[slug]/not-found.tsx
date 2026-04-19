import Link from "next/link";

export default function TeamNotFound() {
  return (
    <div className="container py-20 text-center max-w-lg mx-auto">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-3">团队工作区</p>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">团队不存在或已下线</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        这个团队不存在，或者你当前没有访问权限。你可以先回到发现页，或从工作台进入你有权限的团队工作区。
      </p>
      <Link href="/discover" className="btn btn-primary px-6 py-2.5 text-sm font-semibold inline-block">
        返回发现页
      </Link>
    </div>
  );
}
