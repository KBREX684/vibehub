"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";

/**
 * G-01: Client-side form for requesting a magic link email.
 */
export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.status === 429) {
        setStatus("error");
        setErrorMsg("Too many requests. Please try again later.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection.");
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center py-3 space-y-2">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-success-subtle,rgba(34,197,94,0.1))] flex items-center justify-center mx-auto">
          <CheckCircle className="w-5 h-5 text-[var(--color-success,#22c55e)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Check your email</p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          We sent a sign-in link to <strong>{email}</strong>
        </p>
        <button
          type="button"
          onClick={() => { setStatus("idle"); setEmail(""); }}
          className="text-xs text-[var(--color-primary-hover)] hover:underline mt-2"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="magic-email" className="sr-only">Email address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            id="magic-email"
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50"
          />
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs text-[var(--color-error)]">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !email.trim()}
        className="btn btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending link...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            Send sign-in link
          </>
        )}
      </button>
    </form>
  );
}
