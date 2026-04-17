import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FolderKanban, MessageSquareText, Settings2, ShieldCheck, Users } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug } from "@/lib/repository";
import { TeamLinksSettingsForm } from "@/components/team-links-settings-form";
import { TeamOverviewSettingsForm } from "@/components/team-overview-settings-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamSettingsPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
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
        <div className="card p-8">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">Forbidden</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 mb-0">
            Only team owners and admins can manage team settings, member roles, and external links.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-4xl pb-24 pt-8 space-y-6">
      <Link
        href={`/teams/${encodeURIComponent(team.slug)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to team
      </Link>
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">Team settings</h1>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            Manage how <span className="font-semibold">{team.name}</span> appears to collaborators, how members
            coordinate, and which external links show up across the product.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="space-y-6">
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Overview</h2>
              <p className="text-xs text-[var(--color-text-secondary)] m-0">
                Keep the public team profile accurate before routing people into projects, tasks, or join requests.
              </p>
            </div>
            <TeamOverviewSettingsForm teamSlug={team.slug} initialName={team.name} initialMission={team.mission} />
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">External links</h2>
              <p className="text-xs text-[var(--color-text-secondary)] m-0">
                Keep GitHub and chat references current so discovery pages and team members always land in the right
                place.
              </p>
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
        </div>

        <aside className="space-y-4">
          <section className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-accent-violet)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Members and permissions</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">
              Owners and admins can invite people by email, approve join requests, and change member roles.
            </p>
            <div className="space-y-2">
              {team.members.slice(0, 6).map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[var(--color-text-primary)] font-medium truncate m-0">{member.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate m-0">{member.email}</p>
                  </div>
                  <span className="tag capitalize shrink-0">{member.role}</span>
                </div>
              ))}
            </div>
            <Link
              href={`/teams/${encodeURIComponent(team.slug)}`}
              className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Manage members on team page
            </Link>
          </section>

          <section className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[var(--color-primary-hover)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Coordination shortcuts</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">
              Settings should lead back into the execution loop instead of becoming a dead end.
            </p>
            <div className="grid gap-2">
              <Link href={`/teams/${encodeURIComponent(team.slug)}`} className="btn btn-ghost justify-start text-sm">
                Team overview and join requests
              </Link>
              <Link href={`/teams/${encodeURIComponent(team.slug)}`} className="btn btn-ghost justify-start text-sm">
                Tasks, milestones, and review flow
              </Link>
              <Link href={`/teams/${encodeURIComponent(team.slug)}`} className="btn btn-ghost justify-start text-sm inline-flex items-center gap-2">
                <MessageSquareText className="w-4 h-4" />
                Discussions, chat, and activity log
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
