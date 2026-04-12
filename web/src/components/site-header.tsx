import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand">
          VibeHub
        </Link>
        <nav className="links">
          <Link href="/discussions">Discussions</Link>
          <Link href="/projects/vibehub">Projects</Link>
          <Link href="/creators/alice-ai-builder">Creators</Link>
          <Link href="/admin">Admin</Link>
          <a href="/api/v1/auth/demo-login?role=user&redirect=/" className="button ghost">
            Demo User
          </a>
        </nav>
      </div>
    </header>
  );
}
