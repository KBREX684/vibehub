import type { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { featureProjectToday, clearExpiredFeaturedProjects } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Props { params: Promise<{ slug: string }> }

export async function PATCH(request: NextRequest, { params }: Props) {
  const admin = await requireAdminSession();
  if (!admin.ok) return admin.response;
  const { slug } = await params;

  let rank = 1;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.rank === "number" && body.rank >= 1) rank = Math.floor(body.rank);
  } catch { /* default rank 1 */ }

  try {
    await clearExpiredFeaturedProjects();
    const project = await featureProjectToday(slug, rank);
    return apiSuccess({ project });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "PROJECT_NOT_FOUND") return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
    return apiError({ code: "FEATURE_FAILED", message: msg }, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const admin = await requireAdminSession();
  if (!admin.ok) return admin.response;
  const { slug } = await params;
  try {
    const { prisma } = await import("@/lib/db");
    const project = await prisma.project.update({
      where: { slug },
      data: { featuredRank: null, featuredAt: null },
    });
    return apiSuccess({ project: { id: project.id, slug: project.slug } });
  } catch {
    return apiError({ code: "UNFEATURE_FAILED", message: "Failed to unfeature project" }, 500);
  }
}
