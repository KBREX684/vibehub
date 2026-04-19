"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export interface WorkspaceTopBarStat {
  label: string;
  value: string;
}

export interface WorkspaceTopBarAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

interface WorkspaceTopBarProps {
  iconLetter?: string;
  title: string;
  subtitle?: string;
  projectLabel?: string;
  stats?: WorkspaceTopBarStat[];
  actions?: WorkspaceTopBarAction[];
}

function actionClass(variant: WorkspaceTopBarAction["variant"]) {
  if (variant === "primary") {
    return "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]";
  }
  if (variant === "ghost") {
    return "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]";
  }
  return "bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)]";
}

export function WorkspaceTopBar({
  iconLetter,
  title,
  subtitle,
  projectLabel,
  stats = [],
  actions = [],
}: WorkspaceTopBarProps) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-sm font-semibold text-[var(--color-text-primary)]">
                {iconLetter ?? title.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {title}
                </div>
                {subtitle ? (
                  <div className="truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</div>
                ) : null}
              </div>
            </div>

            {projectLabel ? (
              <>
                <div className="hidden h-5 w-px bg-[var(--color-border)] lg:block" />
                <div className="inline-flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-xs text-[var(--color-text-primary)]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  <span className="truncate font-mono">{projectLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                </div>
              </>
            ) : null}
          </div>

          {stats.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {stats.map((item) => (
                <span
                  key={`${item.label}:${item.value}`}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
                >
                  <span className="text-[var(--color-text-tertiary)]">{item.label}</span>
                  <span className="text-[var(--color-text-primary)]">{item.value}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              const className = [
                "inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium transition-colors",
                actionClass(action.variant),
              ].join(" ");

              if (action.href) {
                return (
                  <a key={action.id} href={action.href} className={className}>
                    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                    {action.label}
                  </a>
                );
              }

              return (
                <button key={action.id} type="button" onClick={action.onClick} className={className}>
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
