import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Settings2, ArrowLeft } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug } from "@/lib/repository";
import { TeamLinksSettingsForm } from "@/components/team-links-settings-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamSettingsPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  if (!session) redirect(`/login?redirect=/teams/${encodeURIComponent(slug)}/settings`);

  const team = await getTeamBySlug(slug, session.userId);
  if (!team) notFound();

  const isOwner = team.ownerUserId === session.userId;
  if (!isOwner) {
    return (
      <main className="container max-w-xl pb-24 pt-8 space-y-6">
        <Link href={`/teams/${encodeURIComponent(slug)}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
          <ArrowLeft className="w-4 h-4" />
          Back to team
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">Forbidden</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 mb-0">Only the team owner can change external links.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <Link
        href={`/teams/${encodeURIComponent(slug)}`}
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
            External links for <span className="font-semibold">{team.name}</span> (Discord, Telegram, Slack, GitHub).
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
    </main>
  );
}
