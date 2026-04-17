import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FolderKanban,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Users,
  Eye,
  Link2,
  GitBranch,
} from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug } from "@/lib/repository";
import { TeamLinksSettingsForm } from "@/components/team-links-settings-form";
import { TeamOverviewSettingsForm } from "@/components/team-overview-settings-form";
import { getServerTranslator } from "@/lib/i18n";
import { Avatar } from "@/components/ui";

interface Props {
  params: Promise<{ slug: string }>;
}

const MEMBERS_PREVIEW_LIMIT = 8;

export default async function TeamSettingsPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();
  if (!session) redirect(`/login?redirect=/teams/${encodeURIComponent(slug)}/settings`);

  const team = await getTeamBySlug(slug, session.userId);
  if (!team) notFound();

  const canManage = team.viewerRole === "owner" || team.viewerRole === "admin";
  if (!canManage) {
    return (
      <main className="container max-w-xl pb-24 pt-8 space-y-6">
        <Link
          href={`/teams/${encodeURIComponent(slug)}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to team
        </Link>
        <div className="card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto border border-[var(--color-border)]">
            <ShieldCheck className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">
            {t("team.settings.forbidden_title")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 mb-0">
            {t("team.settings.forbidden_desc")}
          </p>
          <Link
            href={`/teams/${encodeURIComponent(slug)}`}
            className="btn btn-secondary text-sm px-5 py-2 inline-flex"
          >
            Back to team
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-5xl pb-24 pt-8 space-y-6">
      <Link
        href={`/teams/${encodeURIComponent(team.slug)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to team
      </Link>

      {/* Page header */}
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">{t("team.settings.title")}</h1>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {t("team.settings.subtitle")} — <span className="font-semibold">{team.name}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="space-y-8">

          {/* Overview */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("team.settings.overview")}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] m-0">
                {t("team.settings.overview_desc")}
              </p>
            </div>
            <TeamOverviewSettingsForm teamSlug={team.slug} initialName={team.name} initialMission={team.mission} />
          </section>

          {/* External Links */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[var(--color-text-muted)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("team.settings.external_links")}</h2>
                <p className="text-xs text-[var(--color-text-secondary)] m-0">
                  {t("team.settings.external_links_desc")}
                </p>
              </div>
            </div>
            <TeamLinksSettingsForm
              teamSlug={team.slug}
              initial={{
                discordUrl: team.discordUrl,
                telegramUrl: team.telegramUrl,
                slackUrl: team.slackUrl,
                githubOrgUrl: team.githubOrgUrl,
                githubRepoUrl: team.githubRepoUrl,
              }}
            />
          </section>

          {/* Visibility & Access */}
          <section className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("team.settings.visibility")}</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">
              {t("team.settings.visibility_desc")}
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
              <span className="tag">Public</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                This team is visible to all users and accepts join requests.
              </span>
            </div>
          </section>

          {/* Integrations placeholder */}
          <section className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("team.settings.integrations")}</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">
              {t("team.settings.integrations_desc")}
            </p>
            <div className="p-6 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-center">
              <p className="text-xs text-[var(--color-text-muted)] m-0">
                No integrations configured yet. Connect GitHub, CI/CD, or notification services to your team workflow.
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Members */}
          <section className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-accent-violet)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("team.settings.members")}</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">
              {t("team.settings.members_desc")}
            </p>
            <div className="space-y-2">
              {team.members.slice(0, MEMBERS_PREVIEW_LIMIT).map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex items-center gap-2">
                    <Avatar tone="neutral" size="sm" initial={member.name.charAt(0)} alt={member.name} />
                    <div className="min-w-0">
                      <p className="text-[var(--color-text-primary)] font-medium truncate m-0 text-xs">{member.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate m-0">{member.email}</p>
                    </div>
                  </div>
                  <span className="tag capitalize shrink-0 text-[10px]">{member.role}</span>
                </div>
              ))}
              {team.members.length > MEMBERS_PREVIEW_LIMIT && (
                <p className="text-xs text-[var(--color-text-muted)] text-center pt-1 m-0">
                  +{team.members.length - MEMBERS_PREVIEW_LIMIT} more members
                </p>
              )}
            </div>
            <Link
              href={`/teams/${encodeURIComponent(team.slug)}`}
              className="btn btn-secondary text-sm px-4 py-2 w-full inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Manage on team page
            </Link>
          </section>

          {/* Coordination — links to team detail page sections (tasks, discussions, projects are anchored there) */}
          <section className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[var(--color-primary-hover)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("team.settings.coordination")}</h2>
            </div>
            <div className="grid gap-2">
              <Link href={`/teams/${encodeURIComponent(team.slug)}`} className="btn btn-ghost justify-start text-xs py-2">
                <FolderKanban className="w-3.5 h-3.5" />
                Tasks & milestones
              </Link>
              <Link href={`/teams/${encodeURIComponent(team.slug)}`} className="btn btn-ghost justify-start text-xs py-2">
                <MessageSquareText className="w-3.5 h-3.5" />
                Discussions & chat
              </Link>
              <Link href={`/discover?team=${encodeURIComponent(team.slug)}`} className="btn btn-ghost justify-start text-xs py-2">
                <FolderKanban className="w-3.5 h-3.5" />
                Team projects
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
