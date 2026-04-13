import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import {
  getCreatorProfileByUserId,
  createCreatorProfile,
  updateCreatorProfile,
} from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

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
    return apiError(
      { code: "PROFILE_FETCH_FAILED", message: error instanceof Error ? error.message : "Unknown error" },
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError({ code: "INVALID_JSON", message: "Request body must be valid JSON" }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const skills = Array.isArray(body.skills) ? body.skills.filter((s): s is string => typeof s === "string") : [];
  const collaborationPreference = typeof body.collaborationPreference === "string" ? body.collaborationPreference : "open";

  if (!slug || slug.length < 3 || slug.length > 48) {
    return apiError({ code: "INVALID_SLUG", message: "slug must be 3-48 characters" }, 400);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return apiError({ code: "INVALID_SLUG", message: "slug may only contain lowercase letters, numbers, and hyphens" }, 400);
  }
  if (!headline || headline.length > 200) {
    return apiError({ code: "INVALID_HEADLINE", message: "headline is required and must be ≤200 characters" }, 400);
  }
  if (!bio || bio.length > 2000) {
    return apiError({ code: "INVALID_BIO", message: "bio is required and must be ≤2000 characters" }, 400);
  }

  try {
    const profile = await createCreatorProfile({
      userId: auth.user.userId,
      slug,
      headline,
      bio,
      skills: skills.slice(0, 20),
      collaborationPreference,
    });
    return apiSuccess({ profile }, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "SLUG_TAKEN") {
      return apiError({ code: "SLUG_TAKEN", message: "This slug is already taken" }, 409);
    }
    if (msg === "PROFILE_ALREADY_EXISTS") {
      return apiError({ code: "PROFILE_ALREADY_EXISTS", message: "You already have a creator profile. Use PATCH to update." }, 409);
    }
    return apiError({ code: "PROFILE_CREATE_FAILED", message: msg }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError({ code: "INVALID_JSON", message: "Request body must be valid JSON" }, 400);
  }

  const input: Record<string, unknown> = {};
  if (typeof body.headline === "string") {
    const h = body.headline.trim();
    if (h.length > 200) return apiError({ code: "INVALID_HEADLINE", message: "headline must be ≤200 characters" }, 400);
    input.headline = h;
  }
  if (typeof body.bio === "string") {
    const b = body.bio.trim();
    if (b.length > 2000) return apiError({ code: "INVALID_BIO", message: "bio must be ≤2000 characters" }, 400);
    input.bio = b;
  }
  if (Array.isArray(body.skills)) {
    input.skills = body.skills.filter((s): s is string => typeof s === "string").slice(0, 20);
  }
  if (typeof body.collaborationPreference === "string") {
    input.collaborationPreference = body.collaborationPreference;
  }

  try {
    const profile = await updateCreatorProfile(auth.user.userId, input as {
      headline?: string;
      bio?: string;
      skills?: string[];
      collaborationPreference?: string;
    });
    return apiSuccess({ profile });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "PROFILE_NOT_FOUND") {
      return apiError({ code: "PROFILE_NOT_FOUND", message: "No profile found. Use POST to create one first." }, 404);
    }
    return apiError({ code: "PROFILE_UPDATE_FAILED", message: msg }, 500);
  }
}
