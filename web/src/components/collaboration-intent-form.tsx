"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Send, Users, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

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

  const inputClasses = "w-full bg-black/5 border border-transparent rounded-[12px] px-4 py-3 text-[0.95rem] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-300 focus:bg-white focus:border-[#81e6d9]/50 focus:shadow-[0_0_16px_rgba(129,230,217,0.3)]";

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
        <motion.button 
          type="submit" 
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_4px_12px_rgba(0,122,255,0.2)]"
          whileTap={loading ? {} : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Submitting...
            </span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit collaboration intent
            </>
          )}
        </motion.button>
      </div>

      {success && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-[0.9rem] font-medium text-[#0d9488] bg-[#81e6d9]/20 px-4 py-3 rounded-[12px] flex items-center gap-2"
        >
          {success}
        </motion.p>
      )}
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-[0.9rem] font-medium text-[#e11d48] bg-[#fee2e2] px-4 py-3 rounded-[12px] flex items-center gap-2"
        >
          {error}
        </motion.p>
      )}
    </form>
  );
}
