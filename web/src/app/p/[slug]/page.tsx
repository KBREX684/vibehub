import { ProjectDetailPageContent } from "@/app/projects/[slug]/project-detail-page-content";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function PublicProjectDetailPage({ params }: Props) {
  return <ProjectDetailPageContent params={params} />;
}
