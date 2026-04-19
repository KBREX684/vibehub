/**
 * v8 W2 — creator detail page migrated off the legacy "Apple Bento" palette.
 *
 * Previous layout hard-coded `bg-white`, `bg-black/5`, `bg-[#2d2d30]`,
 * `text-white` and bespoke 32/24 px radii inline. All of that lived outside
 * our design system and was the single biggest source of palette violations
 * on this repo. The new layout uses:
 *   - PageHeader: identity + headline + verify badge + skills
 *   - SectionCard: collaboration preference
 *   - StatCard grid: growth metrics (6 cards, sourced from
 *     /api/v1/creators/{slug}/growth)
 *   - EmptyState: empty portfolio
 *   - TagPill: skill chips
 *
 * Semantics (copy / data) preserved, only the presentation changes.
 */
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CreatorDetailPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/u/${encodeURIComponent(slug)}`);
}
