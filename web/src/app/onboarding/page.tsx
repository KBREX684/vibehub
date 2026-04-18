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
          title: t("onboarding.title"),
          subtitle: t("onboarding.subtitle"),
          stepOf: (current: number, total: number) =>
            t("onboarding.step_of")
              .replace("{{current}}", String(current))
              .replace("{{total}}", String(total)),
          skip: t("onboarding.skip"),
          skipAll: t("onboarding.skip_all"),
          back: t("onboarding.back"),
          next: t("onboarding.next"),
          done: t("onboarding.done"),
          s1: {
            heading: t("onboarding.s1.heading"),
            sub: t("onboarding.s1.sub"),
            nickname: t("onboarding.s1.nickname"),
            nicknameHint: t("onboarding.s1.nicknameHint"),
            nicknamePlaceholder: t("onboarding.s1.nicknamePlaceholder"),
            headline: t("onboarding.s1.headline"),
            headlineHint: t("onboarding.s1.headlineHint"),
            headlinePlaceholder: t("onboarding.s1.headlinePlaceholder"),
            interestsLabel: t("onboarding.s1.interests"),
            interestsHint: t("onboarding.s1.interestsHint"),
          },
          s2: {
            heading: t("onboarding.s2.heading"),
            sub: t("onboarding.s2.sub"),
            note: t("onboarding.s2.note"),
          },
          s3: {
            heading: t("onboarding.s3.heading"),
            sub: t("onboarding.s3.sub"),
            postTitle: t("onboarding.s3.post.title"),
            postDesc: t("onboarding.s3.post.desc"),
            projectTitle: t("onboarding.s3.project.title"),
            projectDesc: t("onboarding.s3.project.desc"),
            agentTitle: t("onboarding.s3.agent.title"),
            agentDesc: t("onboarding.s3.agent.desc"),
          },
          tags: {
            frontend: t("onboarding.tags.frontend"),
            backend: t("onboarding.tags.backend"),
            ai: t("onboarding.tags.ai"),
            infra: t("onboarding.tags.infra"),
            mobile: t("onboarding.tags.mobile"),
            game: t("onboarding.tags.game"),
            design: t("onboarding.tags.design"),
            research: t("onboarding.tags.research"),
          },
          tools: {
            cursor: t("onboarding.tools.cursor"),
            claude: t("onboarding.tools.claude"),
            openclaw: t("onboarding.tools.openclaw"),
            codex: t("onboarding.tools.codex"),
            custom: t("onboarding.tools.custom"),
            none: t("onboarding.tools.none"),
          },
        }}
      />
    </main>
  );
}
