import { apiError } from "@/lib/response";
import type { NextResponse } from "next/server";

/**
 * Centralized mapping from repository-layer error message strings to HTTP responses.
 *
 * The repository / service layer throws `new Error("SOME_CODE")` for domain-level errors.
 * Route handlers catch these and call this function to translate them into structured
 * JSON responses. Unknown codes return `null` (caller handles 500 + logging).
 *
 * P1-ROBUST-2: expanded from ~18 cases to cover all ~50 known error codes, eliminating
 * the need for per-route `if (msg === "...")` switches.
 */
export function apiErrorFromRepositoryMessage(msg: string): NextResponse | null {
  switch (msg) {
    // ── Not Found (404) ──────────────────────────────────────────────────────
    case "POST_NOT_FOUND":
      return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    case "PROJECT_NOT_FOUND":
      return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
    case "USER_NOT_FOUND":
      return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    case "TEAM_NOT_FOUND":
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    case "MEMBERSHIP_NOT_FOUND":
      return apiError({ code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found" }, 404);
    case "API_KEY_NOT_FOUND":
      return apiError({ code: "API_KEY_NOT_FOUND", message: "API key not found" }, 404);
    case "WEBHOOK_NOT_FOUND":
      return apiError({ code: "WEBHOOK_NOT_FOUND", message: "Webhook not found" }, 404);
    case "PROFILE_NOT_FOUND":
      return apiError(
        { code: "PROFILE_NOT_FOUND", message: "No profile found. Use POST to create one first." },
        404
      );
    case "PARENT_COMMENT_NOT_FOUND":
      return apiError({ code: "PARENT_COMMENT_NOT_FOUND", message: "Parent comment not found" }, 404);
    case "COMMENT_NOT_FOUND":
      return apiError({ code: "COMMENT_NOT_FOUND", message: "Comment not found" }, 404);
    case "CHALLENGE_NOT_FOUND":
      return apiError({ code: "CHALLENGE_NOT_FOUND", message: "Challenge not found" }, 404);
    case "COLLABORATION_INTENT_NOT_FOUND":
      return apiError({ code: "COLLABORATION_INTENT_NOT_FOUND", message: "Intent not found" }, 404);
    case "JOIN_REQUEST_NOT_FOUND":
      return apiError({ code: "JOIN_REQUEST_NOT_FOUND", message: "Join request not found" }, 404);
    case "TEAM_TASK_NOT_FOUND":
      return apiError({ code: "TEAM_TASK_NOT_FOUND", message: "Task not found" }, 404);
    case "TEAM_MILESTONE_NOT_FOUND":
      return apiError({ code: "TEAM_MILESTONE_NOT_FOUND", message: "Milestone not found" }, 404);
    case "ENTERPRISE_PROFILE_NOT_FOUND":
    case "APPLICATION_NOT_FOUND":
      return apiError({ code: "APPLICATION_NOT_FOUND", message: "Enterprise profile not found" }, 404);

    // ── Forbidden (403) ──────────────────────────────────────────────────────
    case "FORBIDDEN":
      return apiError({ code: "FORBIDDEN", message: "Not allowed" }, 403);
    case "FORBIDDEN_NOT_OWNER":
      return apiError({ code: "FORBIDDEN", message: "Only the team owner can perform this action" }, 403);
    case "FORBIDDEN_NOT_CREATOR":
      return apiError({ code: "FORBIDDEN", message: "Only the project creator can update this project" }, 403);
    case "FORBIDDEN_NOT_AUTHOR":
      return apiError({ code: "FORBIDDEN", message: "Only the author can modify this resource" }, 403);
    case "FORBIDDEN_NOT_TEAM_MEMBER":
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    case "FORBIDDEN_NOT_PROJECT_OWNER":
      return apiError({ code: "FORBIDDEN", message: "Only the project owner can review intents" }, 403);
    case "FORBIDDEN_TASK_UPDATE":
      return apiError(
        { code: "FORBIDDEN", message: "Only task creator, assignee, or team owner may update this task" },
        403
      );
    case "FORBIDDEN_TASK_DELETE":
      return apiError(
        { code: "FORBIDDEN", message: "Only task creator or team owner may delete this task" },
        403
      );
    case "FORBIDDEN_BATCH_TASK_UPDATE":
      return apiError(
        { code: "FORBIDDEN", message: "Only the team owner can run batch status updates" },
        403
      );
    case "FORBIDDEN_MILESTONE_MEMBER_EDIT":
      return apiError(
        { code: "FORBIDDEN", message: "Only team owners can edit milestone details; members may update progress only" },
        403
      );

    // ── Conflict (409) ───────────────────────────────────────────────────────
    case "SLUG_TAKEN":
      return apiError({ code: "SLUG_TAKEN", message: "This slug is already taken" }, 409);
    case "PROFILE_ALREADY_EXISTS":
      return apiError(
        { code: "PROFILE_ALREADY_EXISTS", message: "You already have a creator profile. Use PATCH to update." },
        409
      );
    case "TEAM_ALREADY_MEMBER":
      return apiError({ code: "TEAM_ALREADY_MEMBER", message: "User is already a member" }, 409);
    case "TEAM_JOIN_REQUEST_PENDING":
      return apiError(
        { code: "TEAM_JOIN_REQUEST_PENDING", message: "You already have a pending join request for this team" },
        409
      );
    case "JOIN_REQUEST_NOT_PENDING":
      return apiError({ code: "JOIN_REQUEST_NOT_PENDING", message: "Join request is not pending" }, 409);
    case "DUPLICATE_INTENT":
      return apiError(
        { code: "DUPLICATE_INTENT", message: "You already submitted an intent for this project" },
        409
      );
    case "ENTERPRISE_PROFILE_NOT_PENDING":
    case "APPLICATION_NOT_PENDING":
      return apiError({ code: "APPLICATION_NOT_PENDING", message: "Profile is not pending review" }, 409);
    case "ENTERPRISE_ALREADY_APPROVED":
      return apiError({ code: "ENTERPRISE_ALREADY_APPROVED", message: "Enterprise access already approved" }, 409);

    // ── Bad Request (400) ────────────────────────────────────────────────────
    case "POST_NOT_APPROVED":
      return apiError(
        { code: "POST_NOT_APPROVED", message: "Only approved posts can be featured" },
        400
      );
    case "CANNOT_FOLLOW_SELF":
      return apiError({ code: "CANNOT_FOLLOW_SELF", message: "Cannot follow yourself" }, 400);
    case "CANNOT_REMOVE_OWNER":
      return apiError({ code: "CANNOT_REMOVE_OWNER", message: "Cannot remove the team owner" }, 400);
    case "MAX_NESTING_DEPTH_EXCEEDED":
      return apiError(
        { code: "MAX_NESTING_DEPTH_EXCEEDED", message: "Maximum reply nesting depth (2) exceeded" },
        400
      );
    case "INVALID_TEAM_NAME":
      return apiError({ code: "INVALID_TEAM_NAME", message: "Team name is required" }, 400);
    case "INVALID_TASK_TITLE":
      return apiError({ code: "INVALID_TASK_TITLE", message: "Title cannot be empty" }, 400);
    case "INVALID_TASK_STATUS":
      return apiError({ code: "INVALID_TASK_STATUS", message: "status must be todo, doing, or done" }, 400);
    case "INVALID_MILESTONE_TITLE":
      return apiError({ code: "INVALID_MILESTONE_TITLE", message: "Title cannot be empty" }, 400);
    case "INVALID_MILESTONE_DATE":
      return apiError({ code: "INVALID_MILESTONE_DATE", message: "targetDate must be a valid ISO date" }, 400);
    case "INVALID_EMAIL":
      return apiError({ code: "INVALID_EMAIL", message: "Invalid email" }, 400);
    case "INVALID_BODY":
      return apiError({ code: "INVALID_BODY", message: "Invalid request body" }, 400);
    case "INVALID_API_KEY_LABEL":
      return apiError({ code: "INVALID_API_KEY_LABEL", message: "Label is required" }, 400);
    case "INVALID_API_KEY_SCOPE":
      return apiError({ code: "INVALID_API_KEY_SCOPE", message: "One or more scopes are invalid" }, 400);
    case "API_KEY_SCOPE_READ_PUBLIC_REQUIRED":
      return apiError(
        { code: "API_KEY_SCOPE_READ_PUBLIC_REQUIRED", message: "scopes must include read:public" },
        400
      );
    case "INVALID_API_KEY_EXPIRES_IN_DAYS":
      return apiError({ code: "INVALID_API_KEY_EXPIRES_IN_DAYS", message: "expiresInDays must be 1–3650" }, 400);
    case "INVALID_WEBHOOK_URL":
      return apiError({ code: "INVALID_WEBHOOK_URL", message: "Webhook URL is invalid" }, 400);
    case "INVALID_WEBHOOK_EVENT":
      return apiError({ code: "INVALID_WEBHOOK_EVENT", message: "One or more event names are invalid" }, 400);
    case "WEBHOOK_URL_BLOCKED":
      return apiError(
        { code: "WEBHOOK_URL_BLOCKED", message: "Webhook URL must be a public HTTPS endpoint (private IPs and localhost are not allowed)." },
        400
      );
    case "UNSUPPORTED_CONTENT_TYPE":
      return apiError({ code: "UNSUPPORTED_CONTENT_TYPE", message: "Unsupported content type" }, 400);
    case "ASSIGNEE_NOT_TEAM_MEMBER":
      return apiError({ code: "ASSIGNEE_NOT_TEAM_MEMBER", message: "Assignee must be a team member" }, 400);
    case "TEAM_TASK_REORDER_EDGE":
      return apiError({ code: "TEAM_TASK_REORDER_EDGE", message: "Cannot move further in that direction" }, 400);
    case "TEAM_OWNER_NO_REQUEST":
      return apiError({ code: "TEAM_OWNER_NO_REQUEST", message: "Team owner does not need to request to join" }, 400);
    case "INVALID_ORGANIZATION_NAME":
    case "INVALID_ORGANIZATION_WEBSITE":
    case "INVALID_WORK_EMAIL":
      return apiError({ code: msg, message: "Invalid enterprise verification payload" }, 400);

    // ── Service Unavailable (503) ────────────────────────────────────────────
    case "STRIPE_NOT_CONFIGURED":
      return apiError(
        { code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured on this server" },
        503
      );

    default:
      return null;
  }
}
