import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bot, ShieldCheck } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  getTeamBySlug,
  listTeamAgentMemberships,
  listAgentActionAuditsForTeam,
} from "@/lib/repository";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SectionCard,
  TagPill,
} from "@/components/ui";
import { TeamAgentsClient } from "./team-agents-client";

/**
 * v8 W3 — Team Agent Bus page.
 *
 * Lists every agent that participates in the team with its role card
 * (reader / commenter / executor / reviewer / coordinator), the owning
 * human, and a short recent-activity timeline sourced from
 * `AgentActionAudit`.
 *
 * Access levels:
 *   - Team owner / admin         — can manage (add / role-change / remove)
 *   - Team member (any role)     — can view
 *   - Non-member                 — 403 handled by the API; we bounce to
 *                                  the team page with a notice
 */
export default async function TeamAgentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(`/teams/${slug}/agents`)}`);
  }
  const team = await getTeamBySlug(slug, session.userId);
  if (!team) notFound();

  const viewerId = session.userId;
  const isMember = team.members.some((m) => m.userId === viewerId);
  if (!isMember) {
    return (
      <main className="container pb-24 pt-6">
        <ErrorState
          kind="forbidden"
          title="Team members only"
          description="Agent bus visibility is limited to people who are already part of this team."
          action={
            <Link
              href={`/teams/${team.slug}`}
              className="btn btn-secondary text-sm px-4 py-2"
            >
              Back to team
            </Link>
          }
          block
        />
      </main>
    );
  }

  const viewerRole = team.viewerRole;
  const canManage = viewerRole === "owner" || viewerRole === "admin";

  // Initial server-rendered snapshot; the client refetches on mutations.
  const [memberships, recentAudits] = await Promise.all([
    listTeamAgentMemberships({ teamSlug: slug, viewerUserId: viewerId }),
    listAgentActionAuditsForTeam({
      teamSlug: slug,
      viewerUserId: viewerId,
      page: 1,
      limit: 25,
    }),
  ]);

  return (
    <main className="container pb-24 pt-6 space-y-6">
      <Link
        href={`/teams/${team.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to {team.name}
      </Link>

      <PageHeader
        icon={Bot}
        eyebrow="AI + HUMAN TEAM"
        title={`Agents in ${team.name}`}
        subtitle={
          canManage
            ? "Add, revoke, or reassign role cards. Writes always flow through the confirmation queue."
            : "Everyone on this team can see which agents are participating and what they have been doing."
        }
        actions={
          <TagPill accent="violet" size="md">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {memberships.filter((m) => m.active).length} active
          </TagPill>
        }
      />

      <SectionCard
        icon={Bot}
        title="Agent roster"
        description="Each row represents an AgentBinding granted a role card in this team. Owner is the human responsible for the binding."
      >
        {memberships.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents in this team yet"
            description={
              canManage
                ? "Add your first agent by picking one of your AgentBindings in the dialog below."
                : "A team owner or admin can bring agents in from their AgentBinding list."
            }
          />
        ) : null}
        <TeamAgentsClient
          teamSlug={team.slug}
          initialMemberships={memberships}
          canManage={canManage}
        />
      </SectionCard>

      <SectionCard
        icon={ShieldCheck}
        title="Recent agent activity"
        description="Last 25 audit entries across all agents in this team (newest first)."
      >
        {recentAudits.items.length === 0 ? (
          <EmptyState title="No agent activity yet" />
        ) : (
          <ul className="divide-y divide-[var(--color-border-subtle)]">
            {recentAudits.items.map((row) => (
              <li key={row.id} className="py-3 flex items-start gap-3">
                <TagPill
                  accent={
                    row.outcome === "succeeded"
                      ? "success"
                      : row.outcome === "rejected"
                        ? "error"
                        : "warning"
                  }
                  size="sm"
                  mono
                >
                  {row.outcome}
                </TagPill>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text-primary)] m-0">
                    <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                      {row.action}
                    </span>
                    {row.taskId ? (
                      <>
                        {" on task "}
                        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                          {row.taskId}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-0.5">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </main>
  );
}
