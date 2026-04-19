import { CreatorDetailPageContent } from "@/app/creators/[slug]/creator-detail-page-content";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function PublicUserProfilePage({ params }: Props) {
  return <CreatorDetailPageContent params={params} />;
}
