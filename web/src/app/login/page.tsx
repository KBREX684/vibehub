import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { sanitizeSameOriginRedirectPath } from "@/lib/redirect-safety";
import { Zap, GitBranch, Shield, ArrowRight, AlertCircle } from "lucide-react";
import { getServerTranslator } from "@/lib/i18n";
import { EmailAuthForms } from "@/components/email-auth-forms";
import { LoginAuroraBackground } from "@/components/login-aurora-background";

interface Props {
  searchParams: Promise<{ redirect?: string; required?: string; error?: string; verified?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t } = await getServerTranslator();

  // Already logged in — redirect away
  const session = await getSessionUserFromCookie();
  if (session) {
    redirect(sanitizeSameOriginRedirectPath(sp.redirect));
  }

  const redirectTo = sanitizeSameOriginRedirectPath(sp.redirect);
  const required    = sp.required;
  const errorCode   = sp.error;

  const ERROR_MESSAGES: Record<string, string> = {
    oauth_failed: t("auth.error.oauth_failed"),
    state_mismatch: t("auth.error.state_mismatch"),
    config_missing: t("auth.error.config_missing"),
    callback_error: t("auth.error.callback_error"),
    github_email_signup_required: "Create your account with email first, then use GitHub as a linked sign-in method.",
    verify_failed: "Email verification failed or link expired.",
  };
  const errorMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? t("auth.error.default")) : null;
  const verifiedOk = sp.verified === "1";

  const oauthHref = `/api/v1/auth/github?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <main className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <LoginAuroraBackground />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--color-text-inverse)]" />
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
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t("auth.admin_required")}</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {t("auth.admin_required_hint")}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t("auth.sign_in_title")}</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {t("auth.sign_in_subtitle")}
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
          {verifiedOk && (
            <div className="p-3 text-xs rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              Email verified. You can sign in below.
            </div>
          )}

          <EmailAuthForms redirectTo={redirectTo} initialMode="login" />
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-2 bg-[var(--color-bg-canvas)] text-[var(--color-text-muted)]">or</span>
            </div>
          </div>

          {/* GitHub OAuth */}
          <a
            href={oauthHref}
            className="btn btn-secondary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            {t("auth.continue_with_github")}
          </a>

          {/* Demo logins */}
          {isDevDemoAuth() && (
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
              <p className="text-xs text-center text-[var(--color-text-muted)] mb-2">{t("auth.development_demo")}</p>
              <a
                href={`/api/v1/auth/demo-login?role=user&redirect=${encodeURIComponent(redirectTo)}`}
                className="btn btn-secondary w-full text-xs py-2"
              >
                {t("auth.demo_user_login")}
              </a>
              <a
                href={`/api/v1/auth/demo-login?role=admin&redirect=${encodeURIComponent(redirectTo)}`}
                className="btn btn-secondary w-full text-xs py-2 border-[var(--color-error)] text-[var(--color-error)]"
              >
                {t("auth.demo_admin_login")}
              </a>
            </div>
          )}

          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            {t("auth.terms_prefix")}{" "}
            <Link href="/terms" className="hover:underline">{t("footer.terms")}</Link>
            {" "}{t("auth.terms_and")}{" "}
            <Link href="/privacy" className="hover:underline">{t("footer.privacy")}</Link>.
          </p>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-5">
          {t("auth.new_to_vibehub")}{" "}
          <Link href="/signup" className="text-[var(--color-primary-hover)] hover:underline font-medium">
            {t("auth.create_account")} <ArrowRight className="inline w-3 h-3" />
          </Link>
        </p>
      </div>
    </main>
  );
}
