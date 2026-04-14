import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface Props {
  searchParams: Promise<{ code?: string; message?: string }>;
}

const ERROR_MAP: Record<string, { title: string; detail: string }> = {
  oauth_failed:   { title: "GitHub login failed",   detail: "The GitHub OAuth handshake failed. Please try again." },
  state_mismatch: { title: "Session expired",       detail: "The login session timed out. Please start fresh." },
  config_missing: { title: "OAuth not configured",  detail: "GitHub OAuth credentials are not set on this server." },
  callback_error: { title: "Login error",           detail: "An unexpected error occurred during login." },
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const sp = await searchParams;
  const code = sp.code ?? "callback_error";
  const err  = ERROR_MAP[code] ?? ERROR_MAP.callback_error;

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-error-subtle)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-[var(--color-error)]" />
          </div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{err.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{err.detail}</p>
          {sp.message && (
            <p className="text-xs text-[var(--color-text-muted)] font-mono bg-[var(--color-bg-elevated)] px-3 py-2 rounded-[var(--radius-md)]">
              {sp.message}
            </p>
          )}
          <Link
            href="/login"
            className="btn btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
