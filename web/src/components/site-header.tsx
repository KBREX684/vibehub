import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand">
          VibeHub
        </Link>
        <nav className="links">
          <Link href="/discussions">讨论广场</Link>
          <Link href="/projects/vibehub">项目画廊</Link>
          <Link href="/creators/alice-ai-builder">创作者</Link>
          <a href="/api/v1/auth/demo-login?role=user&redirect=/" className="button ghost">
            Demo 登录
          </a>
        </nav>
      </div>
    </header>
  );
}
