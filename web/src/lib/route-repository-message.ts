import { apiError } from "@/lib/response";
import type { NextResponse } from "next/server";

/**
 * Maps stable `throw new Error("CODE")` / repository message strings from the monolith
 * repository layer to HTTP responses. Returns null when unknown (caller handles 500 + logging).
 * P1-BE-2: centralize message-based errors instead of duplicating switches per route.
 */
export function apiErrorFromRepositoryMessage(msg: string): NextResponse | null {
  switch (msg) {
    case "POST_NOT_FOUND":
      return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    case "POST_NOT_APPROVED":
      return apiError(
        { code: "POST_NOT_APPROVED", message: "Only approved posts can be featured" },
        400
      );
    case "PROJECT_NOT_FOUND":
      return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
    case "USER_NOT_FOUND":
      return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    case "CANNOT_FOLLOW_SELF":
      return apiError({ code: "CANNOT_FOLLOW_SELF", message: "Cannot follow yourself" }, 400);
    case "TEAM_NOT_FOUND":
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    case "FORBIDDEN_NOT_OWNER":
      return apiError({ code: "FORBIDDEN", message: "Only team owners or admins can perform this action" }, 403);
    case "FORBIDDEN":
      return apiError({ code: "FORBIDDEN", message: "Not allowed" }, 403);
    case "MEMBERSHIP_NOT_FOUND":
      return apiError({ code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found" }, 404);
    case "CANNOT_REMOVE_OWNER":
      return apiError({ code: "CANNOT_REMOVE_OWNER", message: "Cannot remove the team owner" }, 400);
    case "CANNOT_EDIT_OWNER":
      return apiError({ code: "CANNOT_EDIT_OWNER", message: "Cannot change the team owner's role" }, 400);
    case "INVALID_TEAM_ROLE":
      return apiError({ code: "INVALID_TEAM_ROLE", message: "Invalid team role" }, 400);
    case "API_KEY_NOT_FOUND":
      return apiError({ code: "API_KEY_NOT_FOUND", message: "API key not found" }, 404);
    case "WEBHOOK_NOT_FOUND":
      return apiError({ code: "WEBHOOK_NOT_FOUND", message: "Webhook not found" }, 404);
    case "STRIPE_NOT_CONFIGURED":
      return apiError(
        { code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured on this server" },
        503
      );
    case "SLUG_TAKEN":
      return apiError({ code: "SLUG_TAKEN", message: "This slug is already taken" }, 409);
    case "PROFILE_ALREADY_EXISTS":
      return apiError(
        {
          code: "PROFILE_ALREADY_EXISTS",
          message: "You already have a creator profile. Use PATCH to update.",
        },
        409
      );
    case "PROFILE_NOT_FOUND":
      return apiError(
        {
          code: "PROFILE_NOT_FOUND",
          message: "No profile found. Use POST to create one first.",
        },
        404
      );
    case "PARENT_COMMENT_NOT_FOUND":
      return apiError({ code: "PARENT_COMMENT_NOT_FOUND", message: "Parent comment not found" }, 404);
    case "MAX_NESTING_DEPTH_EXCEEDED":
      return apiError(
        {
          code: "MAX_NESTING_DEPTH_EXCEEDED",
          message: "Maximum reply nesting depth (2) exceeded",
        },
        400
      );
    default:
      return null;
  }
}
