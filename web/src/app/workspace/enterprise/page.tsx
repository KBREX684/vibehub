import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getEnterpriseWorkspaceSummary, getProjectRadar, getTalentRadarLegacy as getTalentRadar } from "@/lib/repository";
import { LayoutGrid, Users, Activity, Target, Zap, Shield, UserPlus, FolderGit2, Key, CheckCircle, User, Compass } from "lucide-react";

export default async function EnterpriseWorkspacePage() {
  const session = await getSessionUserFromCookie();
  
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="container pb-24">
          <section className="py-20 md:py-32 flex flex-col items-center text-center relative max-w-3xl mx-auto">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#81e6d9]/40 rounded-full blur-[100px] -z-10 pointer-events-none" />
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[980px] bg-white border border-black/5 text-sm font-medium text-[var(--color-text-secondary)] mb-8 shadow-sm">
              <Shield className="w-4 h-4 text-[#0d9488]" />
              <span>VibeHub Enterprise</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] mb-6 leading-[1.07]">
              Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0d9488] to-[#81e6d9]">Insights</span> Workspace
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--color-text-secondary)] leading-[1.47] mb-10">
              Aggregate team management, collaboration funnels, project radars, and talent discovery. Please log in to access your dedicated workspace.
            </p>

            <a 
              href="/api/v1/auth/demo-login?role=user&redirect=/workspace/enterprise" 
              className="inline-flex items-center gap-2 bg-[var(--color-accent-apple)] hover:bg-[#0062cc] text-white px-8 py-4 rounded-[980px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]"
            >
              Demo Login
            </a>
          </section>
        </main>
      </>
    );
  }

  const [
    { pendingJoinRequests, funnel, teams },
    projectRadar,
    talentRadar
  ] = await Promise.all([
    getEnterpriseWorkspaceSummary({ viewerUserId: session.userId }),
    getProjectRadar(5),
    getTalentRadar(5)
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container pb-24 space-y-8 mt-6">
        
        {/* Header Bento */}
        <section className="p-8 md:p-12 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-[#81e6d9]/20 flex items-center justify-center text-[#0d9488] shadow-sm">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] m-0">
                Enterprise Workspace
              </h1>
              <p className="text-[1.05rem] text-[var(--color-text-secondary)] mt-1">
                Welcome back, {session.name}. Your dedicated collaboration and intelligence panel.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link 
              href="/settings/api-keys" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-black/5 text-[var(--color-text-primary)] rounded-[16px] text-[0.95rem] font-medium hover:bg-black/5 transition-colors shadow-sm active:scale-[0.98]"
            >
              <Key className="w-4 h-4 text-[var(--color-text-tertiary)]" /> API Keys
            </Link>
            <a 
              href="/api/v1/mcp/v2/manifest" 
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2d2d30] text-white rounded-[16px] text-[0.95rem] font-medium hover:bg-black transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 text-[#81e6d9]" /> MCP v2
            </a>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Management & Funnel */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Funnel Metrics Bento */}
            <section className="p-8 md:p-10 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
              <div className="flex items-center gap-3 mb-8">
                <Activity className="w-6 h-6 text-[#0d9488]" />
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Collaboration Funnel</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-[24px] bg-black/5 border border-black/5 flex flex-col justify-center">
                  <span className="text-[0.8rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Total Submissions</span>
                  <strong className="text-4xl font-mono font-bold text-[var(--color-text-primary)]">{funnel.totalSubmissions}</strong>
                </div>
                <div className="p-6 rounded-[24px] bg-[#f5ebd4]/30 border border-[#f5ebd4]/50 flex flex-col justify-center">
                  <span className="text-[0.8rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Pending</span>
                  <strong className="text-4xl font-mono font-bold text-[#d97706]">{funnel.pending}</strong>
                </div>
                <div className="p-6 rounded-[24px] bg-[#81e6d9]/20 border border-[#81e6d9]/40 flex flex-col justify-center">
                  <span className="text-[0.8rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Approved / Rejected</span>
                  <div className="flex items-baseline gap-2">
                    <strong className="text-4xl font-mono font-bold text-[#0d9488]">{funnel.approved}</strong>
                    <span className="text-[1.05rem] font-medium text-[var(--color-text-tertiary)]">/ {funnel.rejected}</span>
                  </div>
                </div>
                <div className="p-6 rounded-[24px] bg-[var(--color-accent-apple)]/10 border border-[var(--color-accent-apple)]/20 flex flex-col justify-center">
                  <span className="text-[0.8rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Approval Rate</span>
                  <strong className="text-4xl font-mono font-bold text-[var(--color-accent-apple)]">{(funnel.approvalRate * 100).toFixed(1)}%</strong>
                </div>
              </div>
            </section>

            {/* Pending Join Requests Bento */}
            <section className="p-8 md:p-10 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-[#d97706]" />
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Pending Join Requests</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#f5ebd4]/40 text-[#d97706] rounded-[980px]">
                  Action Required
                </span>
              </div>

              {pendingJoinRequests.length === 0 ? (
                <div className="text-center py-16 bg-black/5 rounded-[24px] border border-black/5">
                  <CheckCircle className="w-10 h-10 text-[var(--color-text-tertiary)] mx-auto mb-3 opacity-50" />
                  <p className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">No pending requests to review.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {pendingJoinRequests.map((r) => (
                    <li key={r.id} className="group bg-white border border-black/5 rounded-[24px] p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:border-[#f5ebd4]/60 transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <strong className="text-[1.1rem] font-semibold text-[var(--color-text-primary)]">{r.applicantName}</strong>
                            <span className="text-[0.8rem] font-mono text-[var(--color-text-secondary)] bg-black/5 px-2.5 py-1 rounded-md">{r.applicantEmail}</span>
                          </div>
                          <div className="text-[0.95rem] text-[var(--color-text-secondary)] mb-4">
                            Requested to join: 
                            <Link href={`/teams/${encodeURIComponent(r.teamSlug)}`} className="font-semibold text-[var(--color-accent-apple)] hover:underline ml-1.5 outline-none">
                              {r.teamName}
                            </Link>
                          </div>
                          {r.message && (
                            <div className="bg-black/5 p-4 rounded-[16px] text-[0.95rem] text-[var(--color-text-secondary)] italic border border-black/5">
                              &quot;{r.message}&quot;
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <Link 
                            href={`/teams/${encodeURIComponent(r.teamSlug)}`}
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-[var(--color-text-primary)] text-white text-[0.95rem] font-medium rounded-[16px] hover:bg-black transition-colors shadow-sm active:scale-[0.98]"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* My Teams Bento */}
            <section className="p-8 md:p-10 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
              <div className="flex items-center gap-3 mb-8">
                <Users className="w-6 h-6 text-[#007aff]" />
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">My Teams</h2>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-16 bg-black/5 rounded-[24px] border border-black/5">
                  <p className="text-[0.95rem] font-medium text-[var(--color-text-secondary)] mb-6">You haven&apos;t joined any teams yet.</p>
                  <Link href="/teams" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-black/5 text-[var(--color-text-primary)] font-medium rounded-[16px] hover:bg-black/5 transition-colors shadow-sm active:scale-[0.98]">
                    <Compass className="w-4 h-4" /> Explore Teams
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {teams.map((t) => (
                    <Link 
                      key={t.id} 
                      href={`/teams/${encodeURIComponent(t.slug)}`}
                      className="group bg-white border border-black/5 rounded-[24px] p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:border-[#007aff]/40 transition-all duration-300 outline-none"
                    >
                      <h3 className="text-[1.1rem] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-apple)] transition-colors mb-5 truncate leading-snug">
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-3 text-[0.85rem] font-medium text-[var(--color-text-secondary)]">
                        <div className="flex items-center gap-1.5 bg-black/5 px-3 py-1.5 rounded-[10px]">
                          <Users className="w-4 h-4 text-[var(--color-text-tertiary)]" /> {t.memberCount}
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/5 px-3 py-1.5 rounded-[10px]">
                          <FolderGit2 className="w-4 h-4 text-[var(--color-text-tertiary)]" /> {t.projectCount}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Radars */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Project Radar (Dark Glass) */}
            <section className="p-8 rounded-[32px] bg-[#2d2d30] text-white shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)] relative overflow-hidden">
              {/* Radar Scan Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#81e6d9]/10 to-transparent w-[200%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#81e6d9] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 opacity-20 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-[#81e6d9]" />
                  <h2 className="text-xl font-semibold tracking-tight m-0 text-white">Project Radar</h2>
                </div>
                <span className="text-[10px] font-bold bg-white/10 text-white/80 px-2.5 py-1 rounded-[980px] uppercase tracking-wider">
                  Top 5
                </span>
              </div>

              <ul className="space-y-4 relative z-10">
                {projectRadar.map((p) => (
                  <li key={p.slug} className="group">
                    <Link href={`/projects/${p.slug}`} className="block bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[#81e6d9]/40 rounded-[20px] p-5 transition-all duration-300 outline-none">
                      <div className="flex items-center justify-between mb-3 gap-4">
                        <strong className="font-semibold text-[1.05rem] text-[#81e6d9] group-hover:text-white truncate">
                          {p.title}
                        </strong>
                        <span className="text-[0.75rem] font-mono font-bold bg-white/10 px-2.5 py-1 rounded-md text-white/80 shrink-0">
                          {p.score} pts
                        </span>
                      </div>
                      <div className="text-[0.85rem] text-white/60 line-clamp-2 mb-4 leading-[1.47]">
                        {p.oneLiner}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.techStack.slice(0, 3).map(tech => (
                          <span key={tech} className="text-[10px] font-medium px-2 py-1 bg-white/10 text-white/80 rounded-md">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Talent Radar */}
            <section className="p-8 rounded-[32px] bg-gradient-to-br from-[#f5ebd4]/20 to-[#81e6d9]/20 border border-[#81e6d9]/40 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#f5ebd4] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 opacity-40 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-[#d97706]" />
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Talent Radar</h2>
                </div>
                <span className="text-[10px] font-bold bg-[#f5ebd4]/60 text-[#d97706] px-2.5 py-1 rounded-[980px] uppercase tracking-wider">
                  Top 5
                </span>
              </div>

              <ul className="space-y-4 relative z-10">
                {talentRadar.map((t) => (
                  <li key={t.creatorSlug}>
                    <Link href={`/creators/${t.creatorSlug}`} className="block bg-[rgba(255,255,255,0.85)] backdrop-blur-[12px] hover:bg-white border border-white/60 hover:border-[#f5ebd4]/80 rounded-[20px] p-5 transition-all duration-300 shadow-sm hover:shadow-md outline-none group">
                      <div className="flex items-center justify-between mb-2 gap-4">
                        <strong className="font-semibold text-[1.05rem] text-[var(--color-text-primary)] truncate group-hover:text-[#d97706] transition-colors">
                          {t.creatorSlug}
                        </strong>
                        <span className="text-[0.75rem] font-mono font-bold text-[#d97706] bg-[#f5ebd4]/40 px-2.5 py-1 rounded-md shrink-0">
                          {t.contributionScore} pts
                        </span>
                      </div>
                      <div className="text-[0.85rem] text-[var(--color-text-secondary)] truncate mb-4">
                        {t.headline}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-black/5">
                        <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                          {t.collaborationPreference === 'open' ? 'Open' : t.collaborationPreference === 'invite_only' ? 'Invite Only' : 'Closed'}
                        </span>
                        <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 bg-black/5 px-2 py-0.5 rounded-md">
                          <FolderGit2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" /> {t.projectCount}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(50%); }
        }
      `}} />
    </>
  );
}
