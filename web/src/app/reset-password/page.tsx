"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-fetch";

function ResetPasswordInner() {
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
        setErr(j?.error?.message ?? "Reset failed");
        return;
      }
      setMsg("Password updated. You can sign in now.");
    } catch {
      setErr("Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8 space-y-4">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Set a new password</h1>
        {!token && <p className="text-xs text-[var(--color-error)]">Missing reset token in URL.</p>}
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
            placeholder="New password"
            disabled={!token}
          />
          <button type="submit" disabled={loading || !token} className="btn btn-primary w-full">
            {loading ? "…" : "Update password"}
          </button>
        </form>
        <p className="text-center text-xs">
          <Link href="/login" className="text-[var(--color-primary-hover)] underline">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-sm text-[var(--color-text-muted)]">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
