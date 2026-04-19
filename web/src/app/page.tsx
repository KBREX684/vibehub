import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  FolderKanban,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import { HomeCtaFooterClient } from "@/components/home-cta-footer-client";
import { HomeHeroClient } from "@/components/home-hero-client";
import { HomePillarsClient, type PillarItem } from "@/components/home-pillars-client";
import { HeroThreadsBackdrop } from "@/components/visual/hero-threads-backdrop";
import { AnimatedSection, Badge } from "@/components/ui";

export default async function HomePage() {
  const session = await getSessionUserFromCookie();
  if (session) {
    redirect("/work");
  }

  const { t } = await getServerTranslator();

  const pillars: PillarItem[] = [
    {
      icon: "FolderGit2",
      href: "/discover",
      title: t("home.v10.pillars.discover.title", "发现项目"),
      desc: t("home.v10.pillars.discover.desc", "浏览项目、理解团队背景，再决定在哪里发起协作。"),
      accent: "cyan",
    },
    {
      icon: "Users",
      href: "/p/vibehub#project-collaboration-intent",
      title: t("home.v10.pillars.intent.title", "合作申请"),
      desc: t("home.v10.pillars.intent.desc", "用三段式结构化申请替代嘈杂私聊，让协作意图可审核、可追踪。"),
      accent: "apple",
    },
    {
      icon: "Bot",
      href: "/settings/developers",
      title: t("home.v10.pillars.agent.title", "智能代理治理"),
      desc: t("home.v10.pillars.agent.desc", "智能代理以受约束的正式队员身份参与协作，而不是自治操作者。"),
      accent: "violet",
    },
    {
      icon: "FolderGit2",
      href: "/pricing",
      title: t("home.v10.pillars.workspace.title", "团队工作区"),
      desc: t("home.v10.pillars.workspace.desc", "共享上下文、交付状态和受控执行都沉淀在工作区中。"),
      accent: "success",
    },
  ];

  return (
    <main className="container space-y-16 pb-24">
      <section className="relative isolate overflow-hidden rounded-[var(--radius-3xl)] pt-14 text-center">
        <HeroThreadsBackdrop />
        <HomeHeroClient
          primaryCTA="/signup"
          secondaryCTA="/pricing"
          eyebrowText={t("home.v10.eyebrow", "本地开发不变 · 云端协作升级")}
          heroLine1={t("home.v10.hero_line1", "继续在本地开发，")}
          heroLine2={t("home.v10.hero_line2", "把协作统一收进工作区。")}
          heroDescription={t(
            "home.v10.hero_description",
            "VibeHub 不是 IDE，也不是代码托管平台。它是承载项目、合作申请、团队工作区和智能代理受控执行的协作状态层。"
          )}
          primaryLabel={t("home.v10.cta_primary", "进入我的工作台")}
          secondaryLabel={t("home.v10.cta_secondary", "查看团队工作区方案")}
        />
      </section>

      <HomePillarsClient pillars={pillars} />

      <AnimatedSection className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" delayMs={80}>
        <section className="card space-y-4 p-6">
          <div className="flex items-center gap-2">
              <Badge variant="cyan" pill mono size="sm">
              {t("home.v10.section.flow.badge", "主路径")}
            </Badge>
          </div>
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {t("home.v10.section.flow.title", "v10 的产品主线现在是一条连续路径，而不是五块割裂能力。")}
          </h2>
          <p className="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {t(
              "home.v10.section.flow.desc",
              "用户先发现项目，再提交结构化合作申请，进入工作区后与智能代理在确认规则下协同推进交付。"
            )}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                icon: Eye,
                title: t("home.v10.flow.discover.title", "发现"),
                desc: t("home.v10.flow.discover.desc", "项目页是公开发现和判断方向的入口。"),
              },
              {
                icon: Users,
                title: t("home.v10.flow.intent.title", "申请"),
                desc: t("home.v10.flow.intent.desc", "三段式合作申请让协作意图保持清晰、可审核。"),
              },
              {
                icon: FolderKanban,
                title: t("home.v10.flow.workspace.title", "工作区"),
                desc: t("home.v10.flow.workspace.desc", "个人与团队工作区统一组织交付状态、文件与归属关系。"),
              },
              {
                icon: Bot,
                title: t("home.v10.flow.agent.title", "智能代理任务"),
                desc: t("home.v10.flow.agent.desc", "智能代理动作始终可见、可审计、可确认。"),
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
                  <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </div>
                <h3 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <Badge variant="success" pill mono size="sm">
            {t("home.v10.section.boundaries.badge", "产品边界")}
          </Badge>
          <h2 className="m-0 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {t("home.v10.section.boundaries.title", "VibeHub 明确不去做的事情")}
          </h2>
          <div className="space-y-3">
            {[
              t("home.v10.boundaries.ide", "不是 AI IDE。编辑与执行仍然留在本地。"),
              t("home.v10.boundaries.repo", "不是 repo-first 平台。工作区是位于代码托管之上的协作协调层。"),
              t("home.v10.boundaries.chat", "不是开放式聊天产品。合作申请保持结构化。"),
              t("home.v10.boundaries.agent", "不是自治代理模式。高风险动作仍然需要人工确认。"),
            ].map((line) => (
              <div key={line} className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <p className="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)]">{line}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="btn btn-secondary inline-flex px-4 py-2 text-sm">
            {t("home.v10.section.boundaries.cta", "查看团队工作区定价")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </AnimatedSection>

      <AnimatedSection className="grid gap-4 lg:grid-cols-3" delayMs={140}>
        {[
          {
            icon: ShieldCheck,
            title: t("home.v10.cards.compliance.title", "默认可见的合规边界"),
            desc: t("home.v10.cards.compliance.desc", "团队工作区应该把数据地域、AI 边界和高风险确认清晰展示出来，而不是藏在说明里。"),
          },
          {
            icon: Bot,
            title: t("home.v10.cards.governance.title", "智能代理是带护栏的正式队员"),
            desc: t("home.v10.cards.governance.desc", "绑定、成员关系、任务和确认流是不同概念，产品现在会把它们分开呈现。"),
          },
          {
            icon: Users,
            title: t("home.v10.cards.workspace.title", "工作区成为产品中心"),
            desc: t("home.v10.cards.workspace.desc", "路线图现在优先建设工作台主流程，而不是继续扩散公开页面。"),
          },
        ].map(({ icon: Icon, title, desc }) => (
          <section key={title} className="card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
              <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </div>
            <h3 className="m-0 text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{desc}</p>
          </section>
        ))}
      </AnimatedSection>

      <HomeCtaFooterClient
        eyebrowText={t("home.v10.footer.eyebrow", "v10 重构进行中")}
        title={t("home.v10.footer.title", "把项目带进以工作区为中心的协作流程")}
        description={t(
          "home.v10.footer.desc",
          "当前工程重点是先把工作台路由、结构化协作和智能代理安全执行链路做稳，再进行视觉打磨。"
        )}
        primaryLabel={t("home.v10.footer.primary", "创建账号")}
        secondaryLabel={t("home.v10.footer.secondary", "查看开发者接入")}
        primaryHref="/signup"
      />
    </main>
  );
}
