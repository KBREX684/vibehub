import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Zap, GitBranch, Users, Building2, Code2, ArrowLeft } from "lucide-react";

interface Props {
  searchParams: Promise<{ intent?: string }>;
}

export default async function SignupPage({ searchParams: _sp }: Props) {
  // searchParams reserved for future pre-selection (_sp.intent: "developer"|"team"|"enterprise")
  void _sp;
  const session = await getSessionUserFromCookie();
  if (session) redirect("/");

  const PATHS = [
    {
      id: "developer",
      icon: Code2,
      color: "var(--color-primary)",
      title: "Solo Developer",
      desc: "Build projects, join discussions, contribute to teams",
      href: "/api/v1/auth/github?redirect=/",
    },
    {
      id: "team",
      icon: Users,
      color: "var(--color-accent-violet)",
      title: "Team Builder",
      desc: "Create a team, recruit collaborators, ship together",
      href: "/api/v1/auth/github?redirect=/teams/new",
    },
    {
      id: "enterprise",
      icon: Building2,
      color: "var(--color-enterprise)",
      title: "Enterprise",
      desc: "Organisation-level intelligence, talent radar, project tracking",
      href: "/api/v1/auth/github?redirect=/enterprise/verify",
    },
  ];

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </span>
            VibeHub
          </Link>
        </div>

        <div className="card p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Join VibeHub</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Choose your path to get started
            </p>
          </div>

          <div className="space-y-3">
            {PATHS.map((path) => (
              <a
                key={path.id}
                href={path.href}
                className="flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elevated)] transition-all group"
              >
                <div
                  className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${path.color}18`, color: path.color }}
                >
                  <path.icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors">
                    {path.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{path.desc}</p>
                </div>
                <GitBranch className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 self-center ml-auto" />
              </a>
            ))}
          </div>

          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            All paths use GitHub OAuth. No separate password needed.
          </p>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-primary-hover)] hover:underline font-medium">
            <ArrowLeft className="inline w-3 h-3" /> Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
