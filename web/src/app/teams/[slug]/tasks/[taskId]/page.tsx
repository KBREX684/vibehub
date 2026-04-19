import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string; taskId: string }>;
}

export default async function LegacyTeamTaskPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/work/team/${encodeURIComponent(slug)}?view=tasks`);
}
