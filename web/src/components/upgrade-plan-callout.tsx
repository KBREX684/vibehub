import Link from "next/link";
import { UPGRADE_MESSAGES, type UpgradeReason } from "@/lib/subscription";

interface Props {
  upgradeReason?: UpgradeReason;
  className?: string;
}

export function UpgradePlanCallout({ upgradeReason, className }: Props) {
  if (!upgradeReason || !UPGRADE_MESSAGES[upgradeReason]) return null;
  const { title, body } = UPGRADE_MESSAGES[upgradeReason];
  return (
    <div
      className={`rounded-[var(--radius-md)] border border-[var(--color-accent-cyan-border)] bg-[var(--color-primary-subtle)] p-4 text-sm ${className ?? ""}`}
    >
      <p className="font-semibold text-[var(--color-text-primary)] m-0 mb-1">{title}</p>
      <p className="text-[var(--color-text-secondary)] m-0 mb-3 text-xs leading-relaxed">{body}</p>
      <Link href="/pricing" className="btn btn-primary text-xs px-3 py-1.5 inline-flex">
        View Pro pricing
      </Link>
    </div>
  );
}
