/**
 * v8 W1-4 — Developer center rewritten as a three-scenario quick-start hub.
 *
 * Previous shape: a console-style "manage your API keys / agents / OAuth apps /
 * automations" grid. That was the right shape for settings, but the wrong
 * shape for "first contact with VibeHub's developer surface".
 *
 * New shape (three scenarios, each with a copyable snippet):
 *   1. 让 Cursor 在 VibeHub 里搜项目  — MCP quick start
 *   2. 让你的 Agent 加入团队协作     — AgentBinding + role cards
 *   3. 做第三方 Agent / SaaS        — OAuth + billing overview
 *
 * We keep links to existing management pages (api-keys / agents / oauth-apps)
 * but in a sidebar — discovery beats admin on first paint.
 */
import Link from "next/link";
import {
  Bot,
  Terminal,
  Key,
  AppWindow,
  Workflow,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Users,
  Coins,
} from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import { buildMcpV2Manifest } from "@/lib/mcp-v2-tools";
import { buildOpenApiDocument } from "@/lib/openapi-spec";
import { PageHeader, CopyButton, Badge } from "@/components/ui";

function baseUrl() {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return env || "https://vibehub.dev";
}

function abs(path: string) {
  const base = baseUrl();
  if (!base) return path;
  return `${base}${path}`;
}

export default async function DevelopersPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();

  const BASE = baseUrl();
  const openApi = buildOpenApiDocument() as { info?: { version?: string } };
  const manifest = buildMcpV2Manifest();

  const mcpSnippet = `{
  "mcpServers": {
    "vibehub": {
      "url": "${abs("/api/v1/mcp/v2/manifest")}",
      "headers": {
        "Authorization": "Bearer <你的 VibeHub API Key>"
      }
    }
  }
}`;

  const agentCurl = `curl ${abs("/api/v1/me/agent-bindings")} \\
  -H "Authorization: Bearer <你的 VibeHub API Key>" \\
  -H "content-type: application/json" \\
  -d '{"label":"My Cursor Agent","agentType":"cursor"}'`;

  const mcpInvokeCurl = `curl ${abs("/api/v1/mcp/v2/invoke")} \\
  -H "Authorization: Bearer <Bearer Key>" \\
  -H "content-type: application/json" \\
  -d '{"tool":"search_projects","input":{"query":"ai agent"}}'`;

  return (
    <main className="container max-w-6xl pb-24 pt-8 space-y-10 animate-fade-in-up">
      <PageHeader
        icon={Terminal}
        eyebrow={t("developers.v8.eyebrow", "开发者中心 · 3 个场景起步")}
        title={t("developers.v8.title", "把 VibeHub 接进你的 AI 工作流")}
        subtitle={t(
          "developers.v8.subtitle",
          "从 Cursor / Claude / OpenClaw 到你自己的 Agent，我们通过 MCP 与 OpenAPI 提供稳定、可审计的协议位。"
        )}
        actions={
          session ? (
            <Link href="/settings/api-keys" className="btn btn-primary text-sm px-4 py-2">
              <Key className="w-4 h-4" aria-hidden="true" />
              {t("developers.v8.new_key", "创建 API Key")}
            </Link>
          ) : (
            <Link href="/login?redirect=/developers" className="btn btn-primary text-sm px-4 py-2">
              {t("developers.v8.signin", "登录后开始")}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          )
        }
      />

      {/* Three scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-5">
          {/* Scenario 1 */}
          <section className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-cyan-subtle)] border border-[rgba(34,211,238,0.25)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--color-accent-cyan)]" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
                    {t("developers.v8.scenarios.cursor.title", "让 Cursor / Claude 在 VibeHub 里搜项目")}
                  </h2>
                  <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-1 leading-relaxed">
                    {t(
                      "developers.v8.scenarios.cursor.desc",
                      "把 VibeHub MCP manifest 加到 Cursor / Claude Code 的 mcpServers 配置，立刻可以在 IDE 里调用 search_projects、get_project_detail 等只读工具。"
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="cyan" pill>
                {t("developers.v8.scenarios.cursor.tag", "只读 · 秒接入")}
              </Badge>
            </div>

            <CodeBlock code={mcpSnippet} language="json" />
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <a
                href={abs("/api/v1/mcp/v2/manifest")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {t("developers.v8.scenarios.cursor.manifest", "查看 manifest 原始返回")}
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
              <span className="text-[var(--color-text-muted)]">·</span>
              <span>{t("developers.v8.scenarios.cursor.note", "支持 Cursor、Claude Code、OpenClaw、Codex CLI")}</span>
            </div>
          </section>

          {/* Scenario 2 */}
          <section className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-violet-subtle)] border border-[rgba(167,139,250,0.25)] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[var(--color-accent-violet)]" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
                    {t("developers.v8.scenarios.agent.title", "让你的 Agent 作为队员加入团队")}
                  </h2>
                  <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-1 leading-relaxed">
                    {t(
                      "developers.v8.scenarios.agent.desc",
                      "每个 Agent 通过独立 API Key 认证；写入需要人工 Confirmation；高风险动作永不自治。"
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="violet" pill>
                {t("developers.v8.scenarios.agent.tag", "写入 · 需 Confirmation")}
              </Badge>
            </div>

            <CodeBlock code={agentCurl} language="bash" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                {
                  icon: Users,
                  title: t("developers.v8.scenarios.agent.bullet1.title", "角色牌"),
                  desc: t(
                    "developers.v8.scenarios.agent.bullet1.desc",
                    "Reader / Commenter / Executor / Reviewer / Coordinator"
                  ),
                },
                {
                  icon: ShieldCheck,
                  title: t("developers.v8.scenarios.agent.bullet2.title", "可审计"),
                  desc: t(
                    "developers.v8.scenarios.agent.bullet2.desc",
                    "全链路写入 AgentActionAudit 与 AgentConfirmationRequest"
                  ),
                },
                {
                  icon: BookOpen,
                  title: t("developers.v8.scenarios.agent.bullet3.title", "scope 收窄"),
                  desc: t(
                    "developers.v8.scenarios.agent.bullet3.desc",
                    "每个 Key 继承用户权限，再按需裁减，永不超越"
                  ),
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]"
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--color-text-secondary)] mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)] m-0">{title}</p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)] m-0 mt-0.5 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={session ? "/settings/agents" : "/login?redirect=/settings/agents"}
                className="btn btn-secondary text-sm px-4 py-2"
              >
                <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                {t("developers.v8.scenarios.agent.cta_manage", "去「我的 Agent」")}
              </Link>
              <a
                href={abs("/api/v1/openapi.json")}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost text-sm px-4 py-2"
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                {t("developers.v8.scenarios.agent.cta_openapi", "查看 OpenAPI 规范")}
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* Scenario 3 */}
          <section className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-apple-subtle)] border border-[rgba(0,113,227,0.25)] flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[var(--color-accent-apple)]" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
                    {t("developers.v8.scenarios.saas.title", "做第三方 Agent / SaaS")}
                  </h2>
                  <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-1 leading-relaxed">
                    {t(
                      "developers.v8.scenarios.saas.desc",
                      "用 OAuth 让 VibeHub 用户授权你的应用；MCP Developer Access 当前仍是申请制，不在本轮个人订阅流程里直接开放。"
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="apple" pill>
                {t("developers.v8.scenarios.saas.tag", "P1 · 申请制")}
              </Badge>
            </div>

            <CodeBlock code={mcpInvokeCurl} language="bash" />

            <div className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
              {t(
                "developers.v8.scenarios.saas.note",
                "MCP Developer Access 面向 SaaS 型 AI 工具，后续会按量计费。当前只保留能力说明与申请制入口，不面向个人用户直接开通。个人用户请直接使用 Free / Pro 额度。"
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <section className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-accent-cyan)]" aria-hidden="true" />
              {t("developers.v8.sidebar.resources", "资源")}
            </h3>
            <div className="space-y-1">
              {[
                { href: "/developers/api-docs", label: t("developers.v8.sidebar.openapi_docs", "交互式 API Docs") },
                { href: abs("/api/v1/openapi.json"), label: t("developers.v8.sidebar.openapi", "OpenAPI 规范") },
                { href: abs("/api/v1/mcp/v2/manifest"), label: t("developers.v8.sidebar.manifest", "MCP manifest") },
                { href: "/pricing", label: t("developers.v8.sidebar.pricing", "定价与额度") },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("http") || href.startsWith(BASE) ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                >
                  <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
                    {label}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[var(--color-text-muted)]" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              Protocol status
            </h3>
            <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
                <span>OpenAPI version</span>
                <code className="font-mono text-[var(--color-text-primary)]">{openApi.info?.version ?? "1.0.0"}</code>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
                <span>Manifest version</span>
                <code className="font-mono text-[var(--color-text-primary)]">{manifest.manifestVersion}</code>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
                <span>Protocol version</span>
                <code className="font-mono text-[var(--color-text-primary)]">{manifest.protocolVersion}</code>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1">Generated</div>
                <div className="font-mono text-[var(--color-text-primary)]">{new Date(manifest.generatedAt).toISOString()}</div>
              </div>
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("developers.v8.sidebar.manage_title", "管理你的接入")}
            </h3>
            <div className="space-y-1">
              {[
                { href: "/settings/api-keys", icon: Key, label: t("developers.v8.sidebar.manage.keys", "API Keys") },
                { href: "/settings/agents", icon: Bot, label: t("developers.v8.sidebar.manage.agents", "Agents") },
                { href: "/settings/oauth-apps", icon: AppWindow, label: t("developers.v8.sidebar.manage.oauth", "OAuth Apps") },
                { href: "/settings/automations", icon: Workflow, label: t("developers.v8.sidebar.manage.automations", "Automations") },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={session ? href : `/login?redirect=${encodeURIComponent(href)}`}
                  className="flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]" aria-hidden="true" />
                  <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

/* ── Local helpers ─────────────────────────────────────────────────────── */

const CODE_BLOCK_CLASS =
  "m-0 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 text-xs leading-relaxed text-[var(--color-text-secondary)] font-mono";

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton value={code} size="sm" />
      </div>
      <pre className={CODE_BLOCK_CLASS}>
        <code>{code}</code>
      </pre>
      <span className="absolute top-2 left-3 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
        {language}
      </span>
    </div>
  );
}
