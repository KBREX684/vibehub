"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreatorProfile } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  initialProfile: CreatorProfile | null;
}

export function ProfileForm({ initialProfile }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialProfile?.slug ?? "");
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [skillsInput, setSkillsInput] = useState((initialProfile?.skills ?? []).join(", "));
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile?.websiteUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(initialProfile?.githubUrl ?? "");
  const [twitterUrl, setTwitterUrl] = useState(initialProfile?.twitterUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile?.linkedinUrl ?? "");
  const [collaborationPreference, setCollaborationPreference] = useState<"open" | "invite_only" | "closed">(
    initialProfile?.collaborationPreference ?? "open"
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function parseSkills(raw: string): string[] {
    return raw
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);

    const payload = {
      slug: slug.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      skills: parseSkills(skillsInput),
      avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : "__CLEAR__",
      websiteUrl: websiteUrl.trim() ? websiteUrl.trim() : "__CLEAR__",
      githubUrl: githubUrl.trim() ? githubUrl.trim() : "__CLEAR__",
      twitterUrl: twitterUrl.trim() ? twitterUrl.trim() : "__CLEAR__",
      linkedinUrl: linkedinUrl.trim() ? linkedinUrl.trim() : "__CLEAR__",
      collaborationPreference,
    };

    try {
      const hasProfile = Boolean(initialProfile);
      const res = await apiFetch("/api/v1/me/profile", {
        method: hasProfile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error?.message ?? "Failed to save profile");
        return;
      }
      setStatus("success");
      setMessage("Profile saved.");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      {!initialProfile && (
        <p className="text-xs text-[var(--color-text-muted)] m-0">
          First time setup: create your creator profile.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Slug</span>
          <input
            className="input-base"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            minLength={3}
            maxLength={48}
            required
            disabled={Boolean(initialProfile)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Collaboration</span>
          <select
            className="input-base"
            value={collaborationPreference}
            onChange={(e) =>
              setCollaborationPreference(e.target.value as "open" | "invite_only" | "closed")
            }
          >
            <option value="open">Open</option>
            <option value="invite_only">Invite only</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Headline</span>
        <input
          className="input-base"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={200}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Bio</span>
        <textarea
          className="input-base min-h-[140px]"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={2000}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Skills (comma-separated)</span>
        <input
          className="input-base"
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          placeholder="Next.js, Prisma, Product"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Avatar URL</span>
          <input className="input-base" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Website</span>
          <input className="input-base" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">GitHub</span>
          <input className="input-base" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">X / Twitter</span>
          <input className="input-base" type="url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">LinkedIn</span>
        <input className="input-base" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
      </label>

      {message ? (
        <p
          className={`text-sm m-0 ${
            status === "error" ? "text-[var(--color-error)]" : "text-[var(--color-success)]"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
