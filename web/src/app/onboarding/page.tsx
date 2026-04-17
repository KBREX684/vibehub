import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import { OnboardingWizard } from "./onboarding-wizard";

/**
 * v8 W1-3 — Onboarding wizard (3 steps, skip-friendly).
 *
 * Route: `/onboarding`
 *
 * The wizard is fully client-side for step navigation and telemetry; we do
 * not persist wizard state into Prisma this cycle because we deliberately
 * avoid adding migrations while W1 ships. Skip / complete events go to
 * `localStorage` (so we don't re-bug the user) and to the client-side
 * audit trail via `POST /api/v1/me/audit-events` (best effort only).
 *
 * Unauthenticated users are bounced to `/login?redirect=/onboarding`.
 */
export default async function OnboardingPage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/onboarding");
  }
  const { t } = await getServerTranslator();
  return (
    <main className="container max-w-3xl pb-24 pt-10">
      <OnboardingWizard
        labels={{
          title: t("onboarding.title", "欢迎来到 VibeHub"),
          subtitle: t(
            "onboarding.subtitle",
            "花 1 分钟完成三步，平台会根据你填的信息把合适的讨论、项目和队友推给你。"
          ),
          stepOf: (current: number, total: number) =>
            t("onboarding.step_of", "第 {{current}} / {{total}} 步")
              .replace("{{current}}", String(current))
              .replace("{{total}}", String(total)),
          skip: t("onboarding.skip", "跳过"),
          skipAll: t("onboarding.skip_all", "全部跳过"),
          back: t("onboarding.back", "上一步"),
          next: t("onboarding.next", "下一步"),
          done: t("onboarding.done", "完成"),
          s1: {
            heading: t("onboarding.s1.heading", "介绍你自己"),
            sub: t(
              "onboarding.s1.sub",
              "让同行知道你是谁、擅长什么。资料可随时在「设置」里修改。"
            ),
            nickname: t("onboarding.s1.nickname", "昵称"),
            nicknameHint: t(
              "onboarding.s1.nicknameHint",
              "将显示在讨论、项目卡、团队页。"
            ),
            headline: t("onboarding.s1.headline", "一句话介绍"),
            headlineHint: t(
              "onboarding.s1.headlineHint",
              "例如：一个做 AI 开发者工具的独立开发者。不超过 60 个字。"
            ),
            interestsLabel: t("onboarding.s1.interests", "擅长领域"),
            interestsHint: t(
              "onboarding.s1.interestsHint",
              "至少选 1 个，最多 3 个；用于推荐流初始化。"
            ),
          },
          s2: {
            heading: t("onboarding.s2.heading", "你的 AI 工具栈"),
            sub: t(
              "onboarding.s2.sub",
              "告诉我们你常用哪些 AI 编码工具，我们会在你完成绑定时给出针对性的 quick start。"
            ),
            note: t(
              "onboarding.s2.note",
              "此步骤不会自动创建任何 Agent 绑定 —— 绑定必须你主动去「我的 Agent」操作。"
            ),
          },
          s3: {
            heading: t("onboarding.s3.heading", "第一件事"),
            sub: t(
              "onboarding.s3.sub",
              "选一件今天想做的事，我们把你带到该页面。你也可以直接跳过，进入首页。"
            ),
            postTitle: t("onboarding.s3.post.title", "发一条讨论"),
            postDesc: t(
              "onboarding.s3.post.desc",
              "把今天学到的一个 AI+代码方法写成一条讨论。"
            ),
            projectTitle: t("onboarding.s3.project.title", "建一个项目"),
            projectDesc: t(
              "onboarding.s3.project.desc",
              "把正在做的作品发布出来，让同行看到。"
            ),
            agentTitle: t("onboarding.s3.agent.title", "绑定我的第一个 Agent"),
            agentDesc: t(
              "onboarding.s3.agent.desc",
              "让 Cursor / Claude / 自建 Agent 作为队员参与协作。"
            ),
          },
          tags: {
            frontend: t("onboarding.tags.frontend", "前端"),
            backend: t("onboarding.tags.backend", "后端"),
            ai: t("onboarding.tags.ai", "AI / Agent"),
            infra: t("onboarding.tags.infra", "基础设施"),
            mobile: t("onboarding.tags.mobile", "移动端"),
            game: t("onboarding.tags.game", "游戏 / 交互"),
            design: t("onboarding.tags.design", "产品 / 设计"),
            research: t("onboarding.tags.research", "研究 / 论文"),
          },
          tools: {
            cursor: t("onboarding.tools.cursor", "Cursor"),
            claude: t("onboarding.tools.claude", "Claude Code"),
            openclaw: t("onboarding.tools.openclaw", "OpenClaw"),
            codex: t("onboarding.tools.codex", "Codex CLI"),
            custom: t("onboarding.tools.custom", "自建 Agent"),
            none: t("onboarding.tools.none", "暂不使用"),
          },
        }}
      />
    </main>
  );
}
