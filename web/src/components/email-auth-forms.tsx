"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, resetCsrfToken } from "@/lib/api-fetch";

type Mode = "login" | "register" | "forgot";

export function EmailAuthForms({
  redirectTo,
  initialMode = "login",
}: {
  redirectTo: string;
  initialMode?: Mode;
}) {
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
        setError(j?.error?.message ?? "Login failed");
        return;
      }
      resetCsrfToken();
      window.location.href = redirectTo;
    } catch {
      setError("Login failed");
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
        setError(j?.error?.message ?? "Registration failed");
        return;
      }
      setMessage(j?.data?.message ?? "Check your email to verify your account.");
      if (j?.data?.verifyUrl && typeof j.data.verifyUrl === "string") {
        setMessage(`${j.data.message ?? ""} Dev link: ${j.data.verifyUrl}`);
      }
    } catch {
      setError("Registration failed");
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
      setMessage("If an account exists for that email, we sent reset instructions.");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-xs rounded-[var(--radius-md)] bg-[var(--color-error-subtle)] border border-[rgba(239,68,68,0.2)] text-[var(--color-error)]">
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Password</label>
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
            {loading ? "…" : "Sign in with email"}
          </button>
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            <button type="button" className="underline" onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}>
              Forgot password?
            </button>
          </p>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={onRegister} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Display name</label>
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
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
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Password</label>
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
              I agree to the{" "}
              <Link href="/terms" className="text-[var(--color-primary-hover)] underline">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-[var(--color-primary-hover)] underline">Privacy Policy</Link>.
            </span>
          </label>
          <button type="submit" disabled={loading || !acceptTerms} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : "Create account"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={onForgot} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 text-sm font-semibold">
            {loading ? "…" : "Send reset link"}
          </button>
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            <button type="button" className="underline" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
              Back to sign in
            </button>
          </p>
        </form>
      )}

      <div className="flex justify-center gap-2 text-[10px] text-[var(--color-text-muted)]">
        {mode !== "login" && (
          <button type="button" className="underline" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
            Sign in
          </button>
        )}
        {mode !== "register" && (
          <button type="button" className="underline" onClick={() => { setMode("register"); setError(null); setMessage(null); }}>
            Register
          </button>
        )}
      </div>
    </div>
  );
}
