import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyTeamDetailPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/work/team/${encodeURIComponent(slug)}`);
}
