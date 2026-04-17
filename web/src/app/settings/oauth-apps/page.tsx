import Link from "next/link";
import { redirect } from "next/navigation";
import { AppWindow, ArrowLeft } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { OAuthAppsClient } from "./oauth-apps-client";

export default async function OAuthAppsSettingsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/settings/oauth-apps");

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-8">
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Settings
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-sm text-[var(--color-text-muted)]">OAuth Apps</span>
      </div>
      <header className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-warning)]">
          <AppWindow className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">OAuth Apps</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            Register third-party applications that use scoped Bearer access tokens and the OAuth authorization code flow.
          </p>
        </div>
      </header>

      <OAuthAppsClient />
    </main>
  );
}
