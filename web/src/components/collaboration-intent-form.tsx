"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Send, Users, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Button, ErrorBanner } from "@/components/ui";

interface Props {
  projectSlug: string;
}

export function CollaborationIntentForm({ projectSlug }: Props) {
  const [intentType, setIntentType] = useState<"join" | "recruit">("join");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetch(`/api/v1/projects/${projectSlug}/collaboration-intents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intentType,
          message,
          contact: contact || undefined,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(json?.error?.message ?? "Failed to submit collaboration intent");
        return;
      }

      setMessage("");
      setContact("");
      setSuccess("Submitted successfully. Admin review is pending.");
    } catch {
      setError("Network error while submitting collaboration intent");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses = "input-base";

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">Intent type</label>
        <div className="relative">
          <select 
            value={intentType} 
            onChange={(event) => setIntentType(event.target.value as "join" | "recruit")}
            className={`${inputClasses} appearance-none pr-10`}
          >
            <option value="join">I want to join this project</option>
            <option value="recruit">I am recruiting collaborators</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
            {intentType === "join" ? <UserPlus className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Describe your collaboration goal and what you can contribute"
          minLength={10}
          maxLength={500}
          rows={4}
          required
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">Contact (optional)</label>
        <input
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="Email / Discord / X"
          maxLength={120}
          className={inputClasses}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="apple"
          size="md"
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            "Submitting..."
          ) : (
            <>
              <Send className="w-4 h-4" aria-hidden="true" />
              Submit collaboration intent
            </>
          )}
        </Button>
      </div>

      {success ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ErrorBanner tone="info">{success}</ErrorBanner>
        </motion.div>
      ) : null}
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ErrorBanner tone="error">{error}</ErrorBanner>
        </motion.div>
      ) : null}
    </form>
  );
}
