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
          <Link href="/collections">Topics</Link>
          <Link href="/leaderboards">Leaderboards</Link>
          <Link href="/discover">Discover</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/settings/api-keys">API Keys</Link>
          <a href="/api/v1/openapi.json" className="button ghost" target="_blank" rel="noreferrer">
            OpenAPI
          </a>
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
