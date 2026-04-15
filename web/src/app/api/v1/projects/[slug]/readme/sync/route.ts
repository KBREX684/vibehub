import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getProjectBySlug, updateProject } from "@/lib/repository";
import { fetchGitHubReadmeMarkdown } from "@/lib/github-readme";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  const { slug } = await params;
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
    return apiError({ code: "README_SYNC_FAILED", message: error instanceof Error ? error.message : String(error) }, 500);
  }
}
