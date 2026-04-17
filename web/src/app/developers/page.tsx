import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Key,
  Bot,
  AppWindow,
  Workflow,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Plus,
  Terminal,
  Activity,
} from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";

export default async function DevelopersPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();

  const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
  function abs(path: string) {
    return BASE ? `${BASE}${path}` : path;
  }

  /* ── Console layout: overview + sidebar ──────────────────────────────── */
  return (
    <main className="container max-w-6xl pb-24 pt-8 space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-text-primary)]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{t("developers.page_title")}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] m-0 mt-0.5">{t("developers.page_subtitle")}</p>
          </div>
        </div>
        {session && (
          <Link href="/settings/api-keys" className="btn btn-primary text-sm px-5 py-2 inline-flex w-fit">
            <Plus className="w-4 h-4" />
            {t("developers.create_api_key")}
          </Link>
        )}
      </div>

      {!session && (
        <div className="card p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto">
            <Key className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">Sign in to access Developer Console</h2>
          <p className="text-sm text-[var(--color-text-secondary)] m-0 max-w-md mx-auto">
            Create API keys, register agents, configure OAuth apps, and set up automations to integrate with the VibeHub platform.
          </p>
          <Link href="/login?redirect=/developers" className="btn btn-primary text-sm px-6 py-2.5 inline-flex">
            Sign in
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Main content — asset panels */}
        <div className="lg:col-span-8 space-y-5">

          {/* API Keys */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
                <Key className="w-4 h-4 text-[var(--color-primary-hover)]" />
                {t("developers.api_keys")}
              </h2>
              <Link href="/settings/api-keys" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 transition-colors">
                Manage
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0 mb-3">
              Scoped API keys for OpenAPI, MCP tools, public catalog, embeds, and read-only discovery endpoints.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
              <Activity className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <span className="text-xs text-[var(--color-text-muted)]">
                {session ? "View your active keys and usage in settings." : "Sign in to create and manage API keys."}
              </span>
            </div>
          </section>

          {/* Agent Bindings */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
                <Bot className="w-4 h-4 text-[var(--color-accent-violet)]" />
                {t("developers.agents")}
              </h2>
              <Link href="/settings/agents" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 transition-colors">
                Manage
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0 mb-3">
              Register named agents, link API keys, and track MCP invocation audit trails separately from human usage.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
              <Activity className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <span className="text-xs text-[var(--color-text-muted)]">
                {session ? "View registered agents and their activity in settings." : "Sign in to register agents."}
              </span>
            </div>
          </section>

          {/* OAuth Apps */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
                <AppWindow className="w-4 h-4 text-[var(--color-warning)]" />
                {t("developers.oauth_apps")}
              </h2>
              <Link href="/settings/oauth-apps" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 transition-colors">
                Manage
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0 mb-3">
              Register third-party apps that use short-lived Bearer tokens with end-user consent screens instead of raw API keys.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
              <Activity className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <span className="text-xs text-[var(--color-text-muted)]">
                {session ? "View your registered OAuth applications in settings." : "Sign in to register OAuth apps."}
              </span>
            </div>
          </section>

          {/* Automations */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
                <Workflow className="w-4 h-4 text-[var(--color-success)]" />
                {t("developers.automations")}
              </h2>
              <Link href="/settings/automations" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 transition-colors">
                Manage
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0 mb-3">
              Trigger team actions or external notifications from VibeHub events. High-risk steps route through the confirmation queue.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
              <Activity className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <span className="text-xs text-[var(--color-text-muted)]">
                {session ? "View active automation workflows in settings." : "Sign in to create automations."}
              </span>
            </div>
          </section>
        </div>

        {/* Sidebar — quick actions + reference */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">

          {/* Quick Actions */}
          {session && (
            <section className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("developers.quick_links")}</h3>
              <div className="space-y-1">
                {[
                  { href: "/settings/api-keys", icon: Key, label: t("developers.create_api_key") },
                  { href: "/settings/agents", icon: Bot, label: t("developers.register_agent") },
                  { href: "/settings/oauth-apps", icon: AppWindow, label: t("developers.register_oauth_app") },
                  { href: "/settings/automations", icon: Workflow, label: t("developers.create_automation") },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                  >
                    <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors shrink-0" />
                    <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{label}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Reference & Docs */}
          <section className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
              <BookOpen className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              {t("developers.resources")}
            </h3>
            <div className="space-y-1">
              {[
                { href: abs("/api/v1/openapi.json"), label: t("developers.openapi_spec"), external: true },
                { href: abs("/api/v1/mcp/v2/manifest"), label: t("developers.mcp_manifest"), external: true },
              ].map(({ href, label, external }) => (
                <a
                  key={href}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                >
                  <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{label}</span>
                  <ExternalLink className="w-3 h-3 text-[var(--color-text-muted)]" />
                </a>
              ))}
            </div>
          </section>

          {/* Quick Start snippet */}
          <section className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Quick Start</h3>
            <pre className="m-0 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] p-3 text-xs leading-5 text-[var(--color-text-secondary)]">
{`curl ${abs("/api/v1/public/projects")} \\
  -H "Accept: application/json"`}
            </pre>
            <p className="text-xs text-[var(--color-text-muted)] m-0">
              Public catalog endpoints require no authentication. Add a Bearer token for scoped access.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
