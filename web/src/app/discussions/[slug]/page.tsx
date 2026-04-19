import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DiscussionDetailPage({ params }: Props) {
  await params;
  redirect("/discover");
}
