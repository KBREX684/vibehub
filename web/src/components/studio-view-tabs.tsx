"use client";

/**
 * StudioViewTabs — 6 view tabs for the /studio page.
 *
 * Views: tasks / activity / files / snapshots / agents / works
 * Uses URL search param ?view=xxx. Default: tasks.
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  ListTodo,
  Activity,
  FileIcon,
  Camera,
  Bot,
  Briefcase,
} from "lucide-react";

const VIEWS = [
  { key: "tasks", icon: ListTodo, labelKey: "studio.view.tasks" },
  { key: "activity", icon: Activity, labelKey: "studio.view.activity" },
  { key: "files", icon: FileIcon, labelKey: "studio.view.files" },
  { key: "snapshots", icon: Camera, labelKey: "studio.view.snapshots" },
  { key: "agents", icon: Bot, labelKey: "studio.view.agents" },
  { key: "works", icon: Briefcase, labelKey: "studio.view.works" },
] as const;

export type StudioView = (typeof VIEWS)[number]["key"];

export function StudioViewTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const currentView = searchParams.get("view") || "tasks";

  function viewUrl(view: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-4 overflow-x-auto">
      {VIEWS.map(({ key, icon: Icon, labelKey }) => {
        const isActive = currentView === key;
        return (
          <Link
            key={key}
            href={viewUrl(key)}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(labelKey, labelKey.split(".").pop())}
            {isActive && (
              <span
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--color-accent-apple)]"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function useStudioView(): StudioView {
  const searchParams = useSearchParams();
  return (searchParams.get("view") as StudioView) || "tasks";
}
