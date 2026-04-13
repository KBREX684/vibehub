import Link from "next/link";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand">
          VibeHub
        </Link>
        <nav className="links desktop-only">
          <Link href="/discussions">Discussions</Link>
          <Link href="/collections">Topics</Link>
          <Link href="/leaderboards">Leaderboards</Link>
          <Link href="/discover">Discover</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/settings/api-keys">API Keys</Link>
          <Link href="/admin">Admin</Link>
          <a href="/api/v1/auth/github?redirect=/" className="button ghost">
            Login
          </a>
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}
