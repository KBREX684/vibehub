import { redirect } from "next/navigation";
import { AppWindow } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { OAuthAppsClient } from "./oauth-apps-client";

export default async function OAuthAppsSettingsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/settings/oauth-apps");

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-8">
      <header className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)]">
          <AppWindow className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">OAuth apps</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            Register third-party applications, grant scoped Bearer access, and test the OAuth authorization code flow.
          </p>
        </div>
      </header>

      <OAuthAppsClient />
    </main>
  );
}
