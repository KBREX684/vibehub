import type { NextRequest } from "next/server";
import { getProjectBySlug, getGitHubRepoStats } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Props { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
  if (!project.repoUrl) return apiError({ code: "NO_REPO_URL", message: "Project has no repoUrl set" }, 404);

  const stats = await getGitHubRepoStats(project.repoUrl);
  if (!stats) return apiError({ code: "GITHUB_FETCH_FAILED", message: "Could not fetch GitHub stats" }, 502);

  return apiSuccess({ stats });
}
