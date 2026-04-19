import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileById, getProjectBySlug } from "@/lib/repository";
import { EditProjectForm } from "@/components/edit-project-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function EditProjectPageContent({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  if (!session) redirect(`/login?redirect=/p/${encodeURIComponent(slug)}/edit`);

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const creator = await getCreatorProfileById(project.creatorId);
  if (!creator || creator.userId !== session.userId) {
    return (
      <main className="container max-w-xl pb-24 pt-8 space-y-6">
        <Link href={`/p/${encodeURIComponent(slug)}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
          <ArrowLeft className="w-4 h-4" />
          返回项目
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">无访问权限</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 mb-0">只有项目创建者可以编辑这个页面。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <Link
        href={`/p/${encodeURIComponent(project.slug)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="w-4 h-4" />
        返回项目
      </Link>
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
          <Pencil className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">编辑项目</h1>
          <p className="text-xs text-[var(--color-text-secondary)] m-0 font-mono">/{project.slug}</p>
        </div>
      </div>
      <EditProjectForm project={project} />
    </main>
  );
}
