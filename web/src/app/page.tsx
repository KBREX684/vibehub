/**
 * v8 home — first paint must say one thing clearly:
 *   VibeHub = 中国中文开发者的 AI+Human 协作网络
 *
 * Structure (top → bottom):
 *   1. Hero: positioning + dual CTA ("展示我的作品" / "让 Agent 进团队")
 *   2. Four-pillar strip: 广场 / 项目 / 团队 / Agent 总线
 *   3. Live feed + featured projects (real data via HomeFeedSection)
 *   4. Agent-as-teammate section: role cards + how it actually works
 *   5. Differentiation table: why not PH / GitHub / 飞书 / 掘金
 *   6. Pricing / CTA footer
 *
 * No text is hard-coded: every copy string routes through i18n with a
 * Chinese-first fallback (the fallback is used if the key is missing in
 * `zh.json` / `en.json`, which keeps us honest during partial translation).
 */
import Link from "next/link";
import { listProjects, listTeams } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";
import { HomeFeedSection } from "@/components/home-feed-section";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import {
  ArrowRight,
  MessagesSquare,
  FolderGit2,
  Users,
  Bot,
  Sparkles,
  Rocket,
  ShieldCheck,
  Eye,
  Clock,
  Terminal,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui";

export default async function HomePage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();
  const [{ items: projects }, { items: teams }] = await Promise.all([
    listProjects({ page: 1, limit: 6 }),
    listTeams({ page: 1, limit: 3 }),
  ]);

  const primaryCTA = session ? "/projects/new" : "/signup";
  const secondaryCTA = session ? "/settings/agents" : "/developers";

  return (
    <main className="container pb-24 space-y-20">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        id="about"
        className="pt-14 pb-4 text-center animate-fade-in-up scroll-mt-24"
      >
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
          <Sparkles className="w-3 h-3 text-[var(--color-accent-cyan)]" aria-hidden="true" />
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            {t("home.v8.eyebrow", "中国中文开发者 · AI+Human 协作网络")}
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.06] mb-5 max-w-3xl mx-auto">
          <span className="text-[var(--color-text-primary)]">
            {t("home.v8.hero_line1", "让你的作品被看见，")}
          </span>
          <br />
          <span className="text-[var(--color-text-secondary)]">
            {t("home.v8.hero_line2", "让你的 Agent 合法进入团队。")}
          </span>
        </h1>

        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed mb-8">
          {t(
            "home.v8.hero_description",
            "VibeHub 是面向中国中文开发者的协作网络：广场讨论、项目画廊、小团队组队，再加上让 Cursor、Claude、自建 Agent 作为可审计队员参与协作的 Agent 总线。"
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href={primaryCTA}
            className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
          >
            <FolderGit2 className="w-4 h-4" aria-hidden="true" />
            {session
              ? t("home.v8.cta_primary_authed", "展示我的作品")
              : t("home.v8.cta_primary_guest", "免费注册，展示作品")}
          </Link>
          <Link
            href={secondaryCTA}
            className="btn btn-secondary px-6 py-2.5 text-sm font-semibold"
          >
            <Bot className="w-4 h-4" aria-hidden="true" />
            {session
              ? t("home.v8.cta_secondary_authed", "让我的 Agent 进团队")
              : t("home.v8.cta_secondary_guest", "给开发者看 Agent 接入")}
          </Link>
        </div>

        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </section>

      {/* ── Four pillars ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up delay-100">
        {[
          {
            icon: MessagesSquare,
            href: "/discussions",
            title: t("home.v8.pillars.square.title", "广场讨论"),
            desc: t(
              "home.v8.pillars.square.desc",
              "在这里产生灵感、发经验、找同行。"
            ),
            accent: "cyan",
          },
          {
            icon: FolderGit2,
            href: "/discover",
            title: t("home.v8.pillars.gallery.title", "项目画廊"),
            desc: t(
              "home.v8.pillars.gallery.desc",
              "让作品被发现、被收藏、被协作。"
            ),
            accent: "apple",
          },
          {
            icon: Users,
            href: "/teams",
            title: t("home.v8.pillars.teams.title", "团队协作"),
            desc: t(
              "home.v8.pillars.teams.desc",
              "陌生开发者也能低摩擦组队共创。"
            ),
            accent: "violet",
          },
          {
            icon: Bot,
            href: "/settings/agents",
            title: t("home.v8.pillars.agents.title", "Agent 总线"),
            desc: t(
              "home.v8.pillars.agents.desc",
              "Cursor、Claude、自建 Agent 都能作为队员参与。"
            ),
            accent: "success",
          },
        ].map(({ icon: Icon, href, title, desc, accent }) => {
          const accentClass =
            accent === "cyan"
              ? "text-[var(--color-accent-cyan)]"
              : accent === "apple"
                ? "text-[var(--color-accent-apple)]"
                : accent === "violet"
                  ? "text-[var(--color-accent-violet)]"
                  : "text-[var(--color-success)]";
          return (
            <Link
              key={title}
              href={href}
              className="card p-5 group flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${accentClass}`} aria-hidden="true" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
                {title}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed m-0">
                {desc}
              </p>
            </Link>
          );
        })}
      </section>

      {/* ── Live feed + featured projects ───────────────────────────────────── */}
      <HomeFeedSection session={session} projects={projects} teams={teams} />

      {/* ── Agent-as-teammate ───────────────────────────────────────────────── */}
      <section className="space-y-6 animate-fade-in-up delay-200">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-accent-violet)] mb-2">
              {t("home.v8.agent_section.eyebrow", "差异化 · 仅 VibeHub")}
            </div>
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight m-0">
              {t("home.v8.agent_section.title", "Agent 是团队里的正式队员")}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-2xl m-0 mt-2">
              {t(
                "home.v8.agent_section.subtitle",
                "在 VibeHub，你的 Cursor、Claude、自建 Agent 可以作为"
              )}
              <span className="text-[var(--color-text-primary)] font-medium">
                {t("home.v8.agent_section.subtitle_highlight", "可审计 · 可撤回 · 有角色牌")}
              </span>
              {t(
                "home.v8.agent_section.subtitle_tail",
                "的队员参与任务，每一次高风险写入都必须经人工确认。绝不自治。"
              )}
            </p>
          </div>
          <Link
            href="/developers"
            className="btn btn-secondary text-sm px-4 py-2"
          >
            {t("home.v8.agent_section.learn_more", "查看协议接入")}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Eye,
              title: t("home.v8.agent_roles.reader.title", "Reader"),
              desc: t(
                "home.v8.agent_roles.reader.desc",
                "读取任务、讨论、聊天。默认角色，无写入权限。"
              ),
              tone: "info" as const,
            },
            {
              icon: Bot,
              title: t("home.v8.agent_roles.executor.title", "Executor"),
              desc: t(
                "home.v8.agent_roles.executor.desc",
                "可领取任务并标记完成，写入需要人工 Confirmation。"
              ),
              tone: "violet" as const,
            },
            {
              icon: ShieldCheck,
              title: t("home.v8.agent_roles.reviewer.title", "Reviewer"),
              desc: t(
                "home.v8.agent_roles.reviewer.desc",
                "提交审查意见，明确标注 AI 建议，不做最终裁决。"
              ),
              tone: "apple" as const,
            },
          ].map(({ icon: Icon, title, desc, tone }) => (
            <div key={title} className="card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
                </div>
                <Badge variant={tone} pill>
                  {t("home.v8.agent_roles.role_card", "角色牌")}
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
                {title}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed m-0">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* How it actually works — 4 steps */}
        <div className="card p-6 md:p-8 space-y-5 border-t-2 border-t-[var(--color-accent-violet)]">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
            {t("home.v8.how.eyebrow", "4 步跑通人机协作")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: t("home.v8.how.s1.title", "绑定 Agent"),
                desc: t(
                  "home.v8.how.s1.desc",
                  "在「我的 Agent」里为 Cursor / Claude / 自建 agent 发放独立 API Key。"
                ),
              },
              {
                step: "02",
                title: t("home.v8.how.s2.title", "加入团队"),
                desc: t(
                  "home.v8.how.s2.desc",
                  "团队 owner 给 Agent 发「角色牌」：Reader / Executor / Reviewer / Coordinator。"
                ),
              },
              {
                step: "03",
                title: t("home.v8.how.s3.title", "参与任务"),
                desc: t(
                  "home.v8.how.s3.desc",
                  "Agent 读取任务、领取任务、提交审查，所有写入进入确认队列。"
                ),
              },
              {
                step: "04",
                title: t("home.v8.how.s4.title", "人工兜底"),
                desc: t(
                  "home.v8.how.s4.desc",
                  "高风险动作由你本人批准，全链路留有审计日志，随时可撤回。"
                ),
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                    {step}
                  </span>
                  <span className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
                  {title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed m-0">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Differentiation ─────────────────────────────────────────────────── */}
      <section className="space-y-5 animate-fade-in-up delay-300">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)] mb-2">
            {t("home.v8.diff.eyebrow", "定位对比")}
          </div>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight m-0">
            {t("home.v8.diff.title", "VibeHub 不是社区、不是看板、不是代码仓库")}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-2xl m-0 mt-2 leading-relaxed">
            {t(
              "home.v8.diff.subtitle",
              "我们只解决一件别人没解决的事：让 AI Agent 在人类团队里成为可信的一等公民。"
            )}
          </p>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                  {[
                    t("home.v8.diff.col.dimension", "维度"),
                    t("home.v8.diff.col.vibehub", "VibeHub"),
                    t("home.v8.diff.col.other_community", "社区 / 掘金"),
                    t("home.v8.diff.col.github", "GitHub"),
                    t("home.v8.diff.col.feishu", "飞书 / 钉钉"),
                  ].map((label, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    dim: t("home.v8.diff.row.agent.dim", "Agent 作为队员"),
                    vibehub: true,
                    other: false,
                    github: false,
                    feishu: false,
                  },
                  {
                    dim: t("home.v8.diff.row.teaming.dim", "面向陌生开发者的组队"),
                    vibehub: true,
                    other: false,
                    github: false,
                    feishu: false,
                  },
                  {
                    dim: t("home.v8.diff.row.mcp.dim", "内容对 AI 可读 (MCP)"),
                    vibehub: true,
                    other: false,
                    github: false,
                    feishu: false,
                  },
                  {
                    dim: t("home.v8.diff.row.china.dim", "中国大陆落地 + 支付"),
                    vibehub: true,
                    other: true,
                    github: false,
                    feishu: true,
                  },
                  {
                    dim: t("home.v8.diff.row.projects.dim", "项目展示与协作意向"),
                    vibehub: true,
                    other: false,
                    github: true,
                    feishu: false,
                  },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--color-border-subtle)] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)] font-medium">
                      {row.dim}
                    </td>
                    {[row.vibehub, row.other, row.github, row.feishu].map((v, j) => (
                      <td key={j} className="px-4 py-3">
                        {v ? (
                          <CheckCircle2
                            className={
                              j === 0
                                ? "w-4 h-4 text-[var(--color-success)]"
                                : "w-4 h-4 text-[var(--color-text-secondary)]"
                            }
                            aria-label="支持"
                          />
                        ) : (
                          <XCircle
                            className="w-4 h-4 text-[var(--color-text-muted)]"
                            aria-label="不支持"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA footer ─────────────────────────────────────────────────────── */}
      <section className="card p-10 text-center border-t-2 border-t-[var(--color-accent-apple)] animate-fade-in-up delay-400">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-accent-apple)]">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {t("home.v8.cta_footer.eyebrow", "中国大陆优先 · 中文优先")}
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight m-0">
            {t(
              "home.v8.cta_footer.title",
              "从今天开始，把你的 Agent 带进团队"
            )}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-2 max-w-lg mx-auto m-0 leading-relaxed">
            {t(
              "home.v8.cta_footer.desc",
              "免费注册，Pro 月付 ¥29。不烧钱买增长，不替你付 LLM token。"
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={session ? "/projects/new" : "/signup"}
              className="btn btn-primary px-7 py-2.5 text-sm font-semibold"
            >
              {session
                ? t("home.v8.cta_footer.primary_authed", "开始发布作品")
                : t("home.v8.cta_footer.primary_guest", "免费注册")}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/developers"
              className="btn btn-ghost px-6 py-2.5 text-sm font-semibold"
            >
              <Terminal className="w-4 h-4" aria-hidden="true" />
              {t("home.v8.cta_footer.secondary", "给开发者看 Agent 接入")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
