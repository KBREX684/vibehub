"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { NotificationPreferenceDto } from "@/lib/repository";
import { apiFetch } from "@/lib/api-fetch";
import { useLanguage } from "@/app/context/LanguageContext";

type Key = keyof NotificationPreferenceDto;

const FIELDS: { key: Key; labelKey: string; fallback: string }[] = [
  { key: "commentReplies", labelKey: "settings.notifications_comment", fallback: "Comments & replies" },
  { key: "teamUpdates", labelKey: "settings.notifications_team", fallback: "Team activity" },
  { key: "collaborationModeration", labelKey: "settings.notifications_collab", fallback: "Collaboration & moderation" },
  { key: "systemAnnouncements", labelKey: "settings.notifications_system", fallback: "Product & system" },
];

export function NotificationPreferencesForm({ initial }: { initial: NotificationPreferenceDto }) {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<NotificationPreferenceDto>(initial);
  const [saving, setSaving] = useState(false);

  async function save(next: NotificationPreferenceDto) {
    setSaving(true);
    try {
      const res = await apiFetch("/api/v1/me/notification-preferences", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = (await res.json()) as { data?: NotificationPreferenceDto; error?: { message?: string } };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Save failed");
        return;
      }
      setPrefs(json.data);
      toast.success(t("settings.notifications_saved", "Preferences saved."));
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: Key) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    void save(next);
  }

  return (
    <div className="card p-6 space-y-4">
      {FIELDS.map(({ key, labelKey, fallback }) => (
        <label
          key={key}
          className="flex items-center justify-between gap-4 cursor-pointer py-2 border-b border-[var(--color-border-subtle)] last:border-0"
        >
          <span className="text-sm text-[var(--color-text-primary)]">{t(labelKey, fallback)}</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-accent-apple)]"
            checked={prefs[key]}
            disabled={saving}
            onChange={() => toggle(key)}
          />
        </label>
      ))}
    </div>
  );
}
