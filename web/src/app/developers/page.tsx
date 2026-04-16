import Link from "next/link";
import {
  Key,
  BookOpen,
  LayoutTemplate,
  FileBarChart,
  Cpu,
  ExternalLink,
  ShieldAlert,
  Compass,
  Bot,
  AppWindow,
  Workflow,
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";

function abs(path: string) {
  return BASE ? `${BASE}${path}` : path;
}

export default function DevelopersPage() {
  return (
    <main className="container max-w-3xl pb-24 pt-10 space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Developers & integrations
        </p>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">Build on VibeHub</h1>
        <p className="text-sm text-[var(--color-text-secondary)] m-0 max-w-2xl leading-relaxed">
          Build against the same developer-facing surfaces as every other VibeHub user: OpenAPI, MCP v2,
          public catalog APIs, embeds, and scoped API keys. Enterprise verification is badge-only and is not
          required for the normal integration path.
        </p>
      </header>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <Key className="w-4 h-4 text-[var(--color-primary-hover)]" />
          API keys & scopes
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] m-0">
          Create a key under account settings. Default keys already include{" "}
          <code className="text-[0.65rem]">read:public</code>, which unlocks the public catalog, OpenAPI-backed
          endpoints, embeds, and read-only MCP discovery tools.
        </p>
        <Link href="/settings/api-keys" className="btn btn-primary text-sm px-4 py-2 inline-flex w-fit">
          Manage API keys
        </Link>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <Bot className="w-4 h-4 text-[var(--color-featured)]" />
          Agent bindings
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] m-0">
          Register a named agent under settings, then link one or more API keys to that binding. MCP invoke
          audits will capture the bound agent id so you can separate human keys from automation.
        </p>
        <Link href="/settings/agents" className="btn btn-secondary text-sm px-4 py-2 inline-flex w-fit">
          Manage agent bindings
        </Link>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <AppWindow className="w-4 h-4 text-[var(--color-warning)]" />
          OAuth apps
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] m-0">
          Register a third-party app when you need short-lived Bearer tokens and an end-user consent screen instead of handing out raw API keys.
        </p>
        <ul className="space-y-2 text-xs font-mono text-[var(--color-text-secondary)] m-0 pl-0 list-none break-all">
          <li>GET /oauth/authorize?client_id=...&amp;redirect_uri=...&amp;scope=read:public</li>
          <li>POST /api/v1/oauth/token</li>
          <li>GET /api/v1/oauth/userinfo</li>
        </ul>
        <Link href="/settings/oauth-apps" className="btn btn-secondary text-sm px-4 py-2 inline-flex w-fit">
          Manage OAuth apps
        </Link>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <Workflow className="w-4 h-4 text-[var(--color-success)]" />
          Automations
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] m-0">
          Trigger team actions or external notifications from VibeHub events. High-risk workflow steps still route through the same confirmation queue as agent actions.
        </p>
        <Link href="/settings/automations" className="btn btn-secondary text-sm px-4 py-2 inline-flex w-fit">
          Manage automations
        </Link>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <BookOpen className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          Reference
        </h2>
        <ul className="space-y-2 text-sm m-0 pl-0 list-none">
          <li>
            <a
              href={abs("/api/v1/openapi.json")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-primary-hover)] hover:underline"
            >
              OpenAPI 3.0 document
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>
            <a
              href={abs("/api/v1/mcp/v2/manifest")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-primary-hover)] hover:underline"
            >
              MCP v2 manifest
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
        </ul>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <Compass className="w-4 h-4 text-[var(--color-warning)]" />
          Public discovery APIs (Bearer + read:public)
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] m-0">
          Use <code className="text-[0.65rem]">Authorization: Bearer vh_…</code> with a key that includes{" "}
          <code className="text-[0.65rem]">read:public</code>.
        </p>
        <ul className="space-y-2 text-xs font-mono text-[var(--color-text-secondary)] m-0 pl-0 list-none break-all">
          <li>GET /api/v1/projects?limit=20</li>
          <li>GET /api/v1/public/projects</li>
          <li>GET /api/v1/public/teams</li>
          <li>GET /api/v1/public/creators</li>
          <li>GET /api/v1/leaderboards/projects?limit=10</li>
        </ul>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <BookOpen className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          Quick Start
        </h2>
        <pre className="m-0 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] p-4 text-xs leading-6 text-[var(--color-text-secondary)]">
{`curl -X GET ${abs("/api/v1/public/projects")} \\
  -H "Accept: application/json"

curl -X POST ${abs("/api/v1/mcp/v2/invoke")} \\
  -H "Authorization: Bearer vh_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"search_projects","input":{"query":"agent","page":1,"limit":5}}'`}
        </pre>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <LayoutTemplate className="w-4 h-4 text-[var(--color-accent-violet)]" />
          Embeds & oEmbed
        </h2>
        <ul className="space-y-2 text-xs font-mono text-[var(--color-text-secondary)] m-0 pl-0 list-none break-all">
          <li>GET /api/v1/embed/projects/&lt;slug&gt;</li>
          <li>GET /api/v1/embed/teams/&lt;slug&gt;</li>
          <li>GET /api/v1/oembed?url=&lt;project-or-team-url&gt;&amp;format=json</li>
        </ul>
        <p className="text-xs text-[var(--color-text-muted)] m-0">
          Embed routes send CORS headers for browser widgets; oEmbed is public discovery for blogs and CMS tools.
        </p>
      </section>

      <section className="card p-6 space-y-4 border border-[rgba(245,158,11,0.25)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <Cpu className="w-4 h-4 text-[var(--color-featured)]" />
          MCP v2 write tools (opt-in)
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] m-0 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[var(--color-warning)] mt-0.5" />
          Tools <code className="text-[0.65rem]">create_post</code> and <code className="text-[0.65rem]">create_project</code>{" "}
          require explicit scopes <code className="text-[0.65rem]">write:mcp:v2:posts</code> and{" "}
          <code className="text-[0.65rem]">write:mcp:v2:projects</code>. Enable only for trusted agents; creations are
          attributed to the key owner, posts enter the normal moderation queue, and high-risk actions remain outside
          the MCP write surface.
        </p>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 m-0">
          <FileBarChart className="w-4 h-4 text-[var(--color-success)]" />
          Public catalog (no auth)
        </h2>
        <ul className="space-y-2 text-xs font-mono text-[var(--color-text-secondary)] m-0 pl-0 list-none break-all">
          <li>GET /api/v1/public/projects</li>
          <li>GET /api/v1/public/projects/&lt;slug&gt;</li>
        </ul>
      </section>
    </main>
  );
}
