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
    <div className="overflow-x-auto border-b border-[var(--color-border)] hide-scrollbar">
      <div className="flex min-w-max items-center gap-5">
      {tabs.map((tab) => {
        const href = tab.value === "default" ? basePath : `${basePath}?${paramName}=${encodeURIComponent(tab.value)}`;
        const active = current === tab.value || (current === "" && tab.value === "default");
        return (
          <Link
            key={tab.value}
            href={href}
            scroll={false}
            className={[
              "relative inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent py-3 text-sm transition-colors",
              active
                ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
