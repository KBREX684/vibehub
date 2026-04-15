import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import {
  getCreatorProfileByUserId,
  createCreatorProfile,
  updateCreatorProfile,
} from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { createCreatorProfileSchema, patchCreatorProfileSchema } from "./profile-schemas";

type _ProfileRouteUsesZod = z.infer<typeof createCreatorProfileSchema>;

function clearableUrl(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (v === "" || v === "__CLEAR__") return undefined;
  return v;
}

/** PATCH: invalid URLs are ignored (field omitted); valid http(s) URLs are canonicalized. */
function normalizeOptionalUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed === "__CLEAR__") return "";
  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const profile = await getCreatorProfileByUserId(auth.user.userId);
    return apiSuccess({ profile });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(request, { route: "GET /api/v1/me/profile" });
    log.error({ err: serializeError(error) }, "profile fetch failed");
    return apiError(
      {
        code: "PROFILE_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const parsedBody = await readJsonObjectBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const created = createCreatorProfileSchema.safeParse(parsedBody.body);
  if (!created.success) return apiErrorFromZod(created.error);

  const {
    slug,
    headline,
    bio,
    skills,
    avatarUrl,
    websiteUrl,
    githubUrl,
    twitterUrl,
    linkedinUrl,
    collaborationPreference,
  } = created.data;

  try {
    const profile = await createCreatorProfile({
      userId: auth.user.userId,
      slug,
      headline,
      bio,
      skills: skills.slice(0, 20),
      avatarUrl: clearableUrl(avatarUrl),
      websiteUrl: clearableUrl(websiteUrl),
      githubUrl: clearableUrl(githubUrl),
      twitterUrl: clearableUrl(twitterUrl),
      linkedinUrl: clearableUrl(linkedinUrl),
      collaborationPreference,
    });
    return apiSuccess({ profile }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : "Unknown error";
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "POST /api/v1/me/profile" });
    log.error({ err: serializeError(error) }, "profile create failed");
    return apiError({ code: "PROFILE_CREATE_FAILED", message: "Could not create profile" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const parsedBody = await readJsonObjectBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const raw = parsedBody.body;
  if (typeof raw.headline === "string" && raw.headline.trim().length > 200) {
    return apiError({ code: "INVALID_HEADLINE", message: "headline must be ≤200 characters" }, 400);
  }

  const linkKeys = ["avatarUrl", "websiteUrl", "githubUrl", "twitterUrl", "linkedinUrl"] as const;
  const body = { ...raw };
  for (const key of linkKeys) {
    if (body[key] === undefined) continue;
    if (normalizeOptionalUrl(body[key]) === undefined && body[key] !== "" && body[key] !== "__CLEAR__") {
      delete body[key];
    }
  }

  if (Object.keys(body).length === 0) {
    const profile = await getCreatorProfileByUserId(auth.user.userId);
    if (!profile) {
      return apiError({ code: "PROFILE_NOT_FOUND", message: "No profile found. Use POST to create one first." }, 404);
    }
    return apiSuccess({ profile });
  }

  const zPatch = patchCreatorProfileSchema.safeParse(body);
  if (!zPatch.success) return apiErrorFromZod(zPatch.error);

  const parsed = zPatch.data;
  const input: {
    headline?: string;
    bio?: string;
    skills?: string[];
    avatarUrl?: string;
    websiteUrl?: string;
    githubUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    collaborationPreference?: string;
  } = {};

  if (parsed.headline !== undefined) input.headline = parsed.headline;
  if (parsed.bio !== undefined) input.bio = parsed.bio;
  if (parsed.skills !== undefined) input.skills = parsed.skills;
  if (parsed.collaborationPreference !== undefined) input.collaborationPreference = parsed.collaborationPreference;

  for (const key of linkKeys) {
    const val = parsed[key];
    if (val === undefined) continue;
    const cleared = clearableUrl(val);
    if (val === "" || val === "__CLEAR__") input[key] = undefined;
    else if (cleared !== undefined) input[key] = cleared;
  }

  try {
    const profile = await updateCreatorProfile(auth.user.userId, input);
    return apiSuccess({ profile });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : "Unknown error";
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "PATCH /api/v1/me/profile" });
    log.error({ err: serializeError(error) }, "profile update failed");
    return apiError({ code: "PROFILE_UPDATE_FAILED", message: "Could not update profile" }, 500);
  }
}
