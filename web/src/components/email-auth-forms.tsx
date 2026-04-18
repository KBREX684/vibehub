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
        setError(j?.error?.message ?? t("auth.form.login_failed", "Login failed"));
        return;
      }
      resetCsrfToken();
      window.location.href = redirectTo;
    } catch {
      setError(t("auth.form.login_failed", "Login failed"));
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
        setError(j?.error?.message ?? t("auth.form.register_failed", "Registration failed"));
        return;
      }
      const successMessage = t("auth.form.register_success", "Check your email to verify your account.");
      setMessage(successMessage);
      if (j?.data?.verifyUrl && typeof j.data.verifyUrl === "string") {
        setMessage(`${successMessage} ${t("auth.form.dev_link", "Dev link:")} ${j.data.verifyUrl}`);
      }
    } catch {
      setError(t("auth.form.register_failed", "Registration failed"));
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
          "If an account exists for that email, we sent reset instructions."
        )
      );
    } catch {
      setError(t("auth.form.request_failed", "Request failed"));
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.email", "Email")}</label>
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.password", "Password")}</label>
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
            {loading ? "…" : t("auth.form.sign_in_email", "Sign in with email")}
          </button>
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            <button type="button" className="underline" onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}>
              {t("auth.form.forgot_password", "Forgot password?")}
            </button>
          </p>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={onRegister} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.display_name", "Display name")}</label>
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.email", "Email")}</label>
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.password", "Password")}</label>
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
              {t("auth.form.accept_prefix", "I agree to the")}{" "}
              <Link href="/terms" className="text-[var(--color-primary-hover)] underline">{t("footer.terms", "Terms")}</Link>
              {" "}{t("auth.form.accept_and", "and")}{" "}
              <Link href="/privacy" className="text-[var(--color-primary-hover)] underline">{t("footer.privacy", "Privacy Policy")}</Link>.
            </span>
          </label>
          <button type="submit" disabled={loading || !acceptTerms} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : t("auth.form.create_account", "Create account")}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={onForgot} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{t("auth.form.email", "Email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : t("auth.form.send_reset", "Send reset link")}
          </button>
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            <button type="button" className="underline" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
              {t("auth.form.back_to_sign_in", "Back to sign in")}
            </button>
          </p>
        </form>
      )}

      <div className="flex justify-center gap-2 text-[10px] text-[var(--color-text-muted)]">
        {mode !== "login" && (
          <button type="button" className="underline" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
            {t("auth.sign_in", "Sign in")}
          </button>
        )}
        {mode !== "register" && (
          <button type="button" className="underline" onClick={() => { setMode("register"); setError(null); setMessage(null); }}>
            {t("auth.form.register", "Register")}
          </button>
        )}
      </div>
    </div>
  );
}
