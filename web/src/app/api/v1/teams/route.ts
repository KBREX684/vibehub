import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie } from "@/lib/auth";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { createTeam, listTeams } from "@/lib/repository";

const createTeamSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  mission: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:teams:list");
  if (!auth) {
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:teams:list required" }, 401);
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listTeams({ page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "TEAMS_LIST_FAILED",
        message: "Failed to list teams",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const json = await request.json();
    const parsed = createTeamSchema.parse(json);
    const team = await createTeam({
      ownerUserId: session.userId,
      name: parsed.name,
      slug: parsed.slug,
      mission: parsed.mission,
    });
    return apiSuccess(team, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid team payload",
          details: error.flatten(),
        },
        400
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "USER_NOT_FOUND") {
      return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    }
    if (msg === "INVALID_TEAM_NAME") {
      return apiError({ code: "INVALID_TEAM_NAME", message: "Team name is required" }, 400);
    }
    return apiError(
      {
        code: "TEAM_CREATE_FAILED",
        message: "Failed to create team",
        details: msg,
      },
      500
    );
  }
}
