import Link from "next/link";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Key, ArrowLeft, ArrowRight } from "lucide-react";

export default async function ApiKeysSettingsPage() {
  const session = await getSessionUserFromCookie();

  if (!session) {
    return (
      <main className="container max-w-2xl pb-24 pt-8">
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <Key className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            Developer Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Sign in to manage your API keys, scopes, and MCP integrations.
          </p>
          <a
            href="/api/v1/auth/github?redirect=/settings/api-keys"
            className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
          >
            Sign in with GitHub
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-sm text-[var(--color-text-muted)]">API Keys</span>
      </div>

      <div className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Developer Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage API keys, scopes, and MCP integrations
          </p>
        </div>
      </div>

      <ApiKeysPanel currentUserId={session.userId} />
    </main>
  );
}
