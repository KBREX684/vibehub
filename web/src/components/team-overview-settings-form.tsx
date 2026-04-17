"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  teamSlug: string;
  initialName: string;
  initialMission?: string;
}

export function TeamOverviewSettingsForm({ teamSlug, initialName, initialMission }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [mission, setMission] = useState(initialMission ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mission: mission.trim() === "" ? null : mission.trim(),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error?.message ?? "Update failed");
        return;
      }
      setStatus("success");
      setMessage("Team profile saved.");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="team-settings-name" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Team name
        </label>
        <input
          id="team-settings-name"
          className="input-base"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="team-settings-slug" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Team slug
        </label>
        <input id="team-settings-slug" className="input-base opacity-80" value={`/${teamSlug}`} readOnly />
        <p className="text-xs text-[var(--color-text-muted)] m-0">
          The slug stays stable for project links, team invites, and developer integrations.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="team-settings-mission" className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Mission
        </label>
        <textarea
          id="team-settings-mission"
          className="input-base resize-none"
          rows={4}
          maxLength={500}
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="What this team is shipping, who it is for, and how collaborators can help."
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn btn-primary text-sm px-5 py-2" disabled={status === "loading"}>
          {status === "loading" ? "Saving..." : "Save overview"}
        </button>
      </div>
      {message ? (
        <p
          className={`text-sm m-0 ${status === "success" ? "text-[var(--color-accent-apple)]" : "text-[var(--color-error)]"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
