import type { NextRequest } from "next/server";
import { getProjectBySlug, getGitHubRepoStats } from "@/lib/repository";
import { NextResponse } from "next/server";

/**
 * A-3: oEmbed endpoint for VibeHub projects.
 * Spec: https://oembed.com
 * Usage: GET /api/v1/oembed?url=https://vibehub.dev/projects/:slug&format=json
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url") ?? "";
  const format = url.searchParams.get("format") ?? "json";

  if (format !== "json") {
    return NextResponse.json({ error: "Only JSON format is supported" }, { status: 501 });
  }

  // Parse project slug from URL patterns:
  // https://vibehub.dev/projects/:slug  or  /projects/:slug
  const slugMatch = targetUrl.match(/\/projects\/([a-z0-9-]+)/i);
  if (!slugMatch) {
    return NextResponse.json({ error: "Unsupported URL. Must be a /projects/:slug URL." }, { status: 400 });
  }
  const slug = slugMatch[1];

  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: `Project "${slug}" not found` }, { status: 404 });
  }

  const githubStats = project.repoUrl ? await getGitHubRepoStats(project.repoUrl).catch(() => null) : null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://vibehub.dev";

  const response = {
    // Standard oEmbed fields
    type: "rich",
    version: "1.0",
    title: project.title,
    provider_name: "VibeHub",
    provider_url: baseUrl,
    url: `${baseUrl}/projects/${project.slug}`,
    // Extended VibeHub metadata (A-3)
    description: project.oneLiner,
    status: project.status,
    techStack: project.techStack,
    tags: project.tags,
    openSource: project.openSource,
    license: project.license ?? null,
    repoUrl: project.repoUrl ?? null,
    websiteUrl: project.websiteUrl ?? null,
    demoUrl: project.demoUrl ?? null,
    logoUrl: project.logoUrl ?? null,
    screenshots: project.screenshots,
    team: project.team ?? null,
    github: githubStats
      ? {
          stars: githubStats.stars,
          forks: githubStats.forks,
          language: githubStats.language,
          lastPushedAt: githubStats.lastPushedAt,
          openIssues: githubStats.openIssues,
        }
      : null,
    // HTML embed snippet for blog/forum embeds
    html: `<blockquote class="vibehub-embed" data-slug="${project.slug}"><a href="${baseUrl}/projects/${project.slug}" target="_blank"><strong>${project.title}</strong> — ${project.oneLiner}</a></blockquote>`,
  };

  return NextResponse.json(response, {
    headers: {
      "Content-Type": "application/json+oembed",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
