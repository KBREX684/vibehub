import { EditProjectPageContent } from "@/app/projects/[slug]/edit/edit-project-page-content";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function PublicEditProjectPage({ params }: Props) {
  return <EditProjectPageContent params={params} />;
}
