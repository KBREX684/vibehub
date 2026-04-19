import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyTeamSettingsPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/work/team/${encodeURIComponent(slug)}?view=settings`);
}
