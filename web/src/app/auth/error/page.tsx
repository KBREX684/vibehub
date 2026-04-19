import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface Props {
  searchParams: Promise<{ code?: string; message?: string }>;
}

const ERROR_MAP: Record<string, { title: string; detail: string }> = {
  oauth_failed: { title: "GitHub 登录失败", detail: "GitHub OAuth 握手失败，请稍后再试。" },
  state_mismatch: { title: "会话已过期", detail: "本次登录会话已超时，请重新开始登录。" },
  config_missing: { title: "OAuth 未配置", detail: "当前服务器尚未配置 GitHub OAuth 凭据。" },
  callback_error: { title: "登录异常", detail: "登录过程中发生了未预期的错误。" },
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
            返回登录
          </Link>
        </div>
      </div>
    </main>
  );
}
