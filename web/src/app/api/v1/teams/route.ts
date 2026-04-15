import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  authenticateRequest,
  getSessionUserFromCookie,
  rateLimitedResponse,
  resolveReadAuth,
} from "@/lib/auth";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { createTeam, listTeams, getUserTier, countUserTeams } from "@/lib/repository";
import { checkQuota } from "@/lib/quota";

const createTeamSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  mission: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:teams:list");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:teams:list required" }, 401);
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listTeams({ page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "TEAMS_LIST_FAILED",
        message: "Failed to list teams",
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

    // M-1: enforce team limit per subscription tier
    const [tier, teamCount] = await Promise.all([
      getUserTier(session.userId),
      countUserTeams(session.userId),
    ]);
    const gate = checkQuota(tier, "teams", teamCount);
    if (!gate.allowed) {
      return apiError(
        {
          code: "QUOTA_EXCEEDED",
          message: "You have reached the maximum number of teams for your plan.",
          details: {
            resource: "teams",
            tier: gate.tier,
            limit: gate.limit,
            upgradeUrl: "/settings/subscription",
          },
        },
        402
      );
    }

    const team = await createTeam({
      ownerUserId: session.userId,
      name: parsed.name,
      slug: parsed.slug,
      mission: parsed.mission,
    });
    return apiSuccess(team, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
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