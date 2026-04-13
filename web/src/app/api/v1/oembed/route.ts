import { NextResponse } from "next/server";
import { getProjectBySlug } from "@/lib/repository";
import { corsHeaders, corsPreflightResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const format = url.searchParams.get("format") || "json";

  if (format !== "json") {
    return NextResponse.json({ error: "Only json format supported" }, { status: 501, headers: corsHeaders() });
  }

  if (!targetUrl) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400, headers: corsHeaders() });
  }

  const projectMatch = /\/projects\/([a-z0-9-]+)/.exec(targetUrl);
  if (projectMatch) {
    const slug = projectMatch[1];
    const project = await getProjectBySlug(slug);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders() });
    }

    return NextResponse.json({
      version: "1.0",
      type: "rich",
      provider_name: "VibeHub",
      provider_url: "https://vibehub.dev",
      title: project.title,
      description: project.oneLiner,
      url: targetUrl,
      thumbnail_url: null,
      html: `<iframe src="/api/v1/embed/projects/${project.slug}" width="400" height="200" frameborder="0"></iframe>`,
      width: 400,
      height: 200,
    }, { headers: corsHeaders() });
  }

  return NextResponse.json({ error: "URL pattern not recognized" }, { status: 404, headers: corsHeaders() });
}
