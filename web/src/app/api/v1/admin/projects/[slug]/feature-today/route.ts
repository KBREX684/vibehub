import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { featureProjectToday, clearExpiredFeaturedProjects, clearProjectFeatured } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Props { params: Promise<{ slug: string }> }

const patchBodySchema = z.object({
  rank: z.number().int().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: Props) {
  const admin = await requireAdminSession();
  if (!admin.ok) return admin.response;
  const { slug } = await params;

  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const zod = patchBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);
  const rank = zod.data.rank ?? 1;

  try {
    await clearExpiredFeaturedProjects();
    const project = await featureProjectToday(slug, rank);
    return apiSuccess({ project });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "PATCH /api/v1/admin/projects/[slug]/feature-today" });
    log.error({ err: serializeError(err) }, "feature project today failed");
    return apiError({ code: "FEATURE_FAILED", message: msg }, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const admin = await requireAdminSession();
  if (!admin.ok) return admin.response;
  const { slug } = await params;
  try {
    const project = await clearProjectFeatured(slug);
    return apiSuccess({ project: { id: project.id, slug: project.slug } });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(_request, { route: "DELETE /api/v1/admin/projects/[slug]/feature-today" });
    log.error({ err: serializeError(err) }, "unfeature project failed");
    return apiError({ code: "UNFEATURE_FAILED", message: "Failed to unfeature project" }, 500);
  }
}