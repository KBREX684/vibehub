import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getProjectBySlug, updateProject } from "@/lib/repository";
import { fetchGitHubReadmeMarkdown } from "@/lib/github-readme";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";

interface Params {
  params: Promise<{ slug: string }>;
}

const emptyBodySchema = z.object({}).strict();

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const bodyZ = emptyBodySchema.safeParse(parsed.body);
  if (!bodyZ.success) return apiErrorFromZod(bodyZ.error);

  const { slug: rawSlug } = await params;
  const slug = z.string().min(1).parse(rawSlug);
  try {
    const project = await getProjectBySlug(slug);
    if (!project) return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
    if (!project.repoUrl) {
      return apiError({ code: "NO_REPO_URL", message: "Set a GitHub repository URL on the project first" }, 400);
    }
    const readme = await fetchGitHubReadmeMarkdown(project.repoUrl);
    if (!readme) {
      return apiError({ code: "README_FETCH_FAILED", message: "Could not fetch README from GitHub" }, 502);
    }
    const updated = await updateProject({
      projectSlug: slug,
      actorUserId: session.userId,
      readmeMarkdown: readme,
    });
    return apiSuccess({ project: updated });
  } catch (error) {
    const r = apiErrorFromRepositoryCatch(error);
    if (r) return r;
    const log = getRequestLogger(request, { route: "POST /api/v1/projects/[slug]/readme/sync" });
    log.error({ err: serializeError(error) }, "readme sync failed");
    return apiError({ code: "README_SYNC_FAILED", message: "Could not sync README" }, 500);
  }
}
