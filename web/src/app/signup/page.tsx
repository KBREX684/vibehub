import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Zap, GitBranch, ArrowLeft, AlertCircle } from "lucide-react";
import { EmailAuthForms } from "@/components/email-auth-forms";

interface Props {
  searchParams: Promise<{ intent?: string; error?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
  // searchParams reserved for future pre-selection (_sp.intent: "developer"|"team"|"enterprise")
  const sp = await searchParams;
  void sp.intent;
  const session = await getSessionUserFromCookie();
  if (session) redirect("/");
  const needsEmailFirst = sp.error === "github_email_signup_required";

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--color-text-inverse)]" />
            </span>
            VibeHub
          </Link>
        </div>

        <div className="card p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Join VibeHub</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Create your account with email. GitHub stays available as a linked sign-in method.
            </p>
          </div>

          {needsEmailFirst ? (
            <div className="flex items-start gap-2 p-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-text-primary)]" />
              <p className="text-xs text-[var(--color-text-secondary)] m-0">
                First-time accounts must be created with email. After that, you can use GitHub as a linked sign-in method.
              </p>
            </div>
          ) : null}

          <EmailAuthForms redirectTo="/" initialMode="register" />

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-2 bg-[var(--color-bg-canvas)] text-[var(--color-text-muted)]">optional</span>
            </div>
          </div>

          <a
            href="/api/v1/auth/github?redirect=/"
            className="flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elevated)] transition-all group"
          >
            <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 mt-0.5 bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]">
              <GitBranch className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors">
                Already linked GitHub?
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Existing linked accounts can still sign in with GitHub after email-based registration.
              </p>
            </div>
            <GitBranch className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 self-center ml-auto" />
          </a>

          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            Email registration requires inbox verification. GitHub is for linked sign-in, not first-time signup.
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
