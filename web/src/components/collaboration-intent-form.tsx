"use client";

import { FormEvent, useState } from "react";

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
      const response = await fetch(`/api/v1/projects/${projectSlug}/collaboration-intents`, {
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

  return (
    <form className="intent-form" onSubmit={onSubmit}>
      <label>
        Intent type
        <select value={intentType} onChange={(event) => setIntentType(event.target.value as "join" | "recruit")}>
          <option value="join">I want to join this project</option>
          <option value="recruit">I am recruiting collaborators</option>
        </select>
      </label>

      <label>
        Message
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Describe your collaboration goal and what you can contribute"
          minLength={10}
          maxLength={500}
          rows={4}
          required
        />
      </label>

      <label>
        Contact (optional)
        <input
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="Email / Discord / X"
          maxLength={120}
        />
      </label>

      <button type="submit" className="button" disabled={loading}>
        {loading ? "Submitting..." : "Submit collaboration intent"}
      </button>

      {success ? <p className="success-text">{success}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}