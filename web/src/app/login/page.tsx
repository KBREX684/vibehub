import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Zap, GitBranch, Shield, ArrowRight, AlertCircle } from "lucide-react";

interface Props {
  searchParams: Promise<{ redirect?: string; required?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;

  // Already logged in — redirect away
  const session = await getSessionUserFromCookie();
  if (session) {
    const dest = sp.redirect || "/";
    redirect(dest);
  }

  const redirectTo  = sp.redirect  ?? "/";
  const required    = sp.required;
  const errorCode   = sp.error;

  const ERROR_MESSAGES: Record<string, string> = {
    oauth_failed:    "GitHub login failed. Please try again.",
    state_mismatch:  "Login session expired. Please start over.",
    config_missing:  "OAuth is not configured on this server.",
    callback_error:  "An error occurred during login.",
  };
  const errorMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Login error.") : null;

  const oauthHref = `/api/v1/auth/github?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </span>
            VibeHub
          </Link>
        </div>

        <div className="card p-8 space-y-5">
          {/* Role-specific header */}
          {required === "admin" ? (
            <div className="text-center">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-error-subtle)] flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-[var(--color-error)]" />
              </div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Admin login required</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                This area requires administrator credentials.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Sign in to VibeHub</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                The platform for Vibe Coding developers
              </p>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-[var(--color-error-subtle)] border border-[rgba(239,68,68,0.2)] rounded-[var(--radius-md)]">
              <AlertCircle className="w-4 h-4 text-[var(--color-error)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--color-error)]">{errorMsg}</p>
            </div>
          )}

          {/* GitHub OAuth */}
          <a
            href={oauthHref}
            className="btn btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            Continue with GitHub
          </a>

          {/* Demo logins */}
          {process.env.NODE_ENV !== "production" && (
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
              <p className="text-xs text-center text-[var(--color-text-muted)] mb-2">Development demo</p>
              <a
                href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(redirectTo)}`}
                className="btn btn-secondary w-full text-xs py-2"
              >
                Demo User Login
              </a>
              <a
                href={`/api/v1/auth/demo-login?role=admin&redirect=${encodeURIComponent(redirectTo)}`}
                className="btn btn-secondary w-full text-xs py-2 border-[var(--color-error)] text-[var(--color-error)]"
              >
                Demo Admin Login
              </a>
            </div>
          )}

          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            By signing in you agree to our{" "}
            <Link href="/" className="hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-5">
          New to VibeHub?{" "}
          <Link href="/signup" className="text-[var(--color-primary-hover)] hover:underline font-medium">
            Create account <ArrowRight className="inline w-3 h-3" />
          </Link>
        </p>
      </div>
    </main>
  );
}
