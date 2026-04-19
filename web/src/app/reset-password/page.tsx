"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";

function ResetPasswordInner() {
  const { t } = useLanguage();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error?.message ?? t("auth.reset.failed", "重置密码失败"));
        return;
      }
      setMsg(t("auth.reset.success", "密码已更新，现在可以登录了。"));
    } catch {
      setErr(t("auth.reset.failed", "重置密码失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8 space-y-4">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t("auth.reset.title", "设置新密码")}</h1>
        {!token && <p className="text-xs text-[var(--color-error)]">{t("auth.reset.missing_token", "链接中缺少重置令牌。")}</p>}
        {err && <p className="text-xs text-[var(--color-error)]">{err}</p>}
        {msg && <p className="text-xs text-[var(--color-text-secondary)]">{msg}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input w-full text-sm"
            placeholder={t("auth.reset.new_password", "新密码")}
            disabled={!token}
          />
          <button type="submit" disabled={loading || !token} className="btn btn-primary w-full">
            {loading ? "…" : t("auth.reset.submit", "更新密码")}
          </button>
        </form>
        <p className="text-center text-xs">
          <Link href="/login" className="text-[var(--color-primary-hover)] underline">{t("auth.form.back_to_sign_in", "返回登录")}</Link>
        </p>
      </div>
    </main>
  );
}

function ResetPasswordFallback() {
  const { t } = useLanguage();

  return <div className="container py-16 text-sm text-[var(--color-text-muted)]">{t("common.loading", "加载中…")}</div>;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
