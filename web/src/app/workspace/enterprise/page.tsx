import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { hasEnterpriseWorkspaceAccess } from "@/lib/enterprise-access";
import {
  getEnterpriseWorkspaceSummary,
  getLatestEnterpriseVerificationApplication,
  getProjectRadar,
  getTalentRadarLegacy as getTalentRadar,
} from "@/lib/repository";
import {
  LayoutGrid,
  Users,
  Activity,
  Target,
  Zap,
  Shield,
  FolderGit2,
  Key,
  CheckCircle,
  Lock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default async function EnterpriseWorkspacePage() {
  const session = await getSessionUserFromCookie();

  // Not logged in → redirect to login with enterprise intent
  if (!session) {
    redirect("/login?redirect=/workspace/enterprise&intent=enterprise");
  }

  // Logged in but no enterprise access → show gating / upsell page
  if (!hasEnterpriseWorkspaceAccess(session.enterpriseStatus)) {
    const latestApplication = await getLatestEnterpriseVerificationApplication(session.userId);
    const gateMessage =
      latestApplication?.status === "pending"
        ? "Your access request is in review. This secondary radar workspace stays locked until approval."
        : latestApplication?.status === "rejected"
          ? "Your previous request was rejected. Update the organization details and resubmit if this workspace is still needed."
          : "Radar workspace access is optional and requires approved enterprise status.";
    const gateCtaHref =
      latestApplication?.status === "pending" ? "/enterprise/verify" : "/enterprise/verify";
    const gateCtaLabel =
      latestApplication?.status === "pending" ? "View request status" : "Request access";

    return (
      <main className="container max-w-2xl pb-24 pt-12 space-y-8">
        {/* Hero */}
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-enterprise-subtle)] via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-enterprise-subtle)] flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-[var(--color-enterprise)]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-enterprise-subtle)] border border-[rgba(16,185,129,0.2)] text-xs font-semibold text-[var(--color-enterprise)] mb-4">
              Secondary workspace
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              Radar workspace access
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto mb-4">
              A secondary observer layer for project radar, talent discovery, and collaboration summaries.
              VibeHub&apos;s main loop still lives in community, projects, teams, and developer tools.
            </p>
            <p className="text-xs text-[var(--color-warning)] max-w-lg mx-auto mb-8">
              {gateMessage}
            </p>

            <p className="text-xs text-[var(--color-text-secondary)] max-w-lg mx-auto mb-6">
              For public radar APIs, talent lists, and ecosystem metrics you only need a normal account and an API key with{" "}
              <code className="text-[0.65rem] bg-[var(--color-bg-elevated)] px-1 rounded">read:public</code> — see the{" "}
              <Link href="/developers" className="text-[var(--color-primary-hover)] hover:underline">
                Developers hub
              </Link>
              .
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
              {[
                { icon: TrendingUp, title: "Project radar", desc: "Track trending projects and collaboration velocity" },
                { icon: Users, title: "Talent radar", desc: "Discover active contributors across the ecosystem" },
                { icon: Activity, title: "Intent funnel", desc: "Visualize intent → approval → membership conversion" },
                { icon: FolderGit2, title: "Team summary", desc: "Review team-level tasks, milestones, and join queues" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <Icon className="w-4 h-4 text-[var(--color-enterprise)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <Link href={gateCtaHref} className="btn btn-primary text-sm px-6 py-2.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                {gateCtaLabel}
              </Link>
              <Link
                href="/developers"
                className="btn btn-ghost text-sm px-5 py-2.5"
              >
                Developer hub
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Current plan */}
        <div className="card p-5 flex items-center gap-3">
          <Lock className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Your account: <span className="capitalize">{session.role}</span>
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Approved enterprise status is required for this secondary workspace.
              {session.role === "admin" ? " Admins use the governance console for review and moderation." : ""}
            </p>
          </div>
          <Link
            href={session.role === "admin" ? "/admin/enterprise/verifications" : "/enterprise/verify"}
            className="btn btn-secondary text-xs px-3 py-1.5 shrink-0 ml-auto"
          >
            {session.role === "admin" ? "Open admin review" : "Request access"}
          </Link>
        </div>
      </main>
    );
  }

  // ── Enterprise access granted ──────────────────────────────────────────────

  const [{ pendingJoinRequests, funnel, teams }, projectRadar, talentRadar] =
    await Promise.all([
      getEnterpriseWorkspaceSummary({ viewerUserId: session.userId }),
      getProjectRadar(5),
      getTalentRadar(5),
    ]);

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-enterprise-subtle)] flex items-center justify-center text-[var(--color-enterprise)]">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Enterprise Workspace</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Secondary observer workspace for {session.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/api-keys" className="btn btn-secondary text-sm px-4 py-1.5 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            API Keys
          </Link>
          <a href="/api/v1/mcp/v2/manifest" target="_blank" rel="noreferrer" className="btn btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            MCP
          </a>
          <Link href="/developers" className="btn btn-ghost text-sm px-3 py-1.5">
            Developers
          </Link>
        </div>
      </section>

      {/* Funnel metrics */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          Collaboration Intent Funnel
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total",     value: funnel.totalSubmissions,                                     color: "var(--color-text-primary)" },
            { label: "Pending",   value: funnel.pending,                                              color: "var(--color-warning)" },
            { label: "Approved",  value: funnel.approved,                                             color: "var(--color-success)" },
            { label: "Rejected",  value: funnel.rejected,                                             color: "var(--color-error)" },
            { label: "Overall %", value: `${(funnel.approvalRate * 100).toFixed(1)}%`,                color: "var(--color-primary-hover)" },
            { label: "Reviewed %",value: `${(funnel.reviewedApprovalRate * 100).toFixed(1)}%`,        color: "var(--color-accent-cyan)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <strong className="text-xl font-bold" style={{ color }}>{value}</strong>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Project Radar */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--color-primary-hover)]" />
            Project Radar — Top 5
          </h2>
          {projectRadar.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {projectRadar.map((p) => (
                <div key={p.slug} className="flex items-center justify-between gap-3 p-3 bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)]">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.slug}`} className="text-xs font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-hover)] truncate block">
                      {p.title}
                    </Link>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{p.oneLiner}</p>
                  </div>
                  <span className="tag tag-blue shrink-0 font-mono">{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Talent Radar */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-accent-violet)]" />
            Talent Radar — Top 5
          </h2>
          {talentRadar.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {talentRadar.map((t) => (
                <div key={t.creatorSlug} className="flex items-center justify-between gap-3 p-3 bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)]">
                  <div className="min-w-0">
                    <Link href={`/creators/${t.creatorSlug}`} className="text-xs font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-hover)] truncate block">
                      {t.creatorSlug}
                    </Link>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{t.headline}</p>
                  </div>
                  <span className="tag tag-violet shrink-0 font-mono">{t.contributionScore}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Pending join requests */}
      {pendingJoinRequests.length > 0 && (
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-warning)]" />
            Pending Join Requests ({pendingJoinRequests.length})
          </h2>
          <div className="space-y-2">
            {pendingJoinRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)]">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">{r.applicantName}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">{r.message || "No message"}</p>
                </div>
                <Link href={`/teams/${r.teamId}`} className="tag tag-blue shrink-0">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teams summary */}
      {teams.length > 0 && (
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            Your Teams ({teams.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map((t) => (
              <Link key={t.id} href={`/teams/${t.slug}`} className="p-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all group">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors">{t.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{t.memberCount} members · {t.projectCount} projects</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Access badge */}
      <div className="flex items-center gap-2">
        <CheckCircle className="w-3.5 h-3.5 text-[var(--color-enterprise)]" />
        <span className="text-xs text-[var(--color-text-muted)]">Approved secondary workspace access active</span>
      </div>
    </main>
  );
}
