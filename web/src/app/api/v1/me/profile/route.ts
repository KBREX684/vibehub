import type { NextRequest } from "next/server";
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
import { createCreatorProfileSchema } from "./profile-schemas";

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

  const z = createCreatorProfileSchema.safeParse(parsedBody.body);
  if (!z.success) return apiErrorFromZod(z.error);

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
  } = z.data;

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
    return apiError({ code: "PROFILE_CREATE_FAILED", message: msg }, 500);
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

  const body = parsedBody.body;
  if (Object.keys(body).length === 0) {
    return apiError({ code: "NO_FIELDS", message: "Provide at least one field to update" }, 400);
  }

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

  if (typeof body.headline === "string") {
    const h = body.headline.trim();
    if (h.length > 200) {
      return apiError({ code: "INVALID_HEADLINE", message: "headline must be ≤200 characters" }, 400);
    }
    input.headline = h;
  }
  if (typeof body.bio === "string") {
    const b = body.bio.trim();
    if (b.length > 2000) {
      return apiError({ code: "INVALID_BIO", message: "bio must be ≤2000 characters" }, 400);
    }
    input.bio = b;
  }
  if (Array.isArray(body.skills)) {
    input.skills = body.skills.filter((s): s is string => typeof s === "string").slice(0, 20);
  }
  if (typeof body.collaborationPreference === "string") {
    input.collaborationPreference = body.collaborationPreference;
  }

  for (const key of ["avatarUrl", "websiteUrl", "githubUrl", "twitterUrl", "linkedinUrl"] as const) {
    if (body[key] !== undefined) {
      const next = normalizeOptionalUrl(body[key]);
      if (next === "") input[key] = undefined;
      else if (next !== undefined) input[key] = next;
    }
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
    return apiError({ code: "PROFILE_UPDATE_FAILED", message: msg }, 500);
  }
}
