import Link from "next/link";

export interface WorkViewTab {
  label: string;
  value: string;
}

interface Props {
  basePath: string;
  current: string;
  tabs: WorkViewTab[];
  paramName?: string;
}

export function WorkViewTabs({ basePath, current, tabs, paramName = "view" }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const href = tab.value === "default" ? basePath : `${basePath}?${paramName}=${encodeURIComponent(tab.value)}`;
        const active = current === tab.value || (current === "" && tab.value === "default");
        return (
          <Link
            key={tab.value}
            href={href}
            scroll={false}
            className={[
              "inline-flex min-w-[7rem] items-center justify-center rounded-[var(--radius-pill)] border px-3.5 py-2 text-xs transition-colors",
              active
                ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
