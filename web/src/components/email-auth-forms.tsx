"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, resetCsrfToken } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";

type Mode = "login" | "register" | "forgot";

export function EmailAuthForms({
  redirectTo,
  initialMode = "login",
}: {
  redirectTo: string;
  initialMode?: Mode;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error?.message ?? t("auth.form.login_failed", "登录失败"));
        return;
      }
      resetCsrfToken();
      window.location.href = redirectTo;
    } catch {
      setError(t("auth.form.login_failed", "登录失败"));
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          acceptTerms,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(j?.error?.message ?? t("auth.form.register_failed", "注册失败"));
        return;
      }
      const successMessage = t("auth.form.register_success", "请检查邮箱并完成账号验证。");
      setMessage(successMessage);
      if (j?.data?.verifyUrl && typeof j.data.verifyUrl === "string") {
        setMessage(`${successMessage} ${t("auth.form.dev_link", "开发环境验证链接：")} ${j.data.verifyUrl}`);
      }
    } catch {
      setError(t("auth.form.register_failed", "注册失败"));
    } finally {
      setLoading(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage(
        t(
          "auth.form.reset_sent",
          "如果该邮箱已注册，我们已发送重置说明。"
        )
      );
    } catch {
      setError(t("auth.form.request_failed", "请求失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-xs rounded-[var(--radius-md)] bg-[var(--color-error-subtle)] border border-[var(--color-error-border)] text-[var(--color-error)]">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 text-xs rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {message}
        </div>
      )}

      {mode === "login" && (
        <form onSubmit={onLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.email", "邮箱")}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.password", "密码")}</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : t("auth.form.sign_in_email", "使用邮箱登录")}
          </button>
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            <button type="button" className="underline" onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}>
              {t("auth.form.forgot_password", "忘记密码？")}
            </button>
          </p>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={onRegister} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.display_name", "显示名称")}</label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.email", "邮箱")}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.password", "密码")}</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <label className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t("auth.form.accept_prefix", "我已阅读并同意")}{" "}
              <Link href="/terms" className="text-[var(--color-primary-hover)] underline">{t("footer.terms", "服务条款")}</Link>
              {" "}{t("auth.form.accept_and", "以及")}{" "}
              <Link href="/privacy" className="text-[var(--color-primary-hover)] underline">{t("footer.privacy", "隐私政策")}</Link>。
            </span>
          </label>
          <button type="submit" disabled={loading || !acceptTerms} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : t("auth.form.create_account", "创建账号")}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={onForgot} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.email", "邮箱")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : t("auth.form.send_reset", "发送重置链接")}
          </button>
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            <button type="button" className="underline" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
              {t("auth.form.back_to_sign_in", "返回登录")}
            </button>
          </p>
        </form>
      )}

      <div className="flex justify-center gap-2 text-[10px] text-[var(--color-text-muted)]">
        {mode !== "login" && (
          <button type="button" className="underline" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
            {t("auth.sign_in", "登录")}
          </button>
        )}
        {mode !== "register" && (
          <button type="button" className="underline" onClick={() => { setMode("register"); setError(null); setMessage(null); }}>
            {t("auth.form.register", "注册")}
          </button>
        )}
      </div>
    </div>
  );
}
