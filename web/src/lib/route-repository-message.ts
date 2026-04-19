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
      return apiError({ code: "POST_NOT_FOUND", message: "未找到帖子" }, 404);
    case "POST_NOT_APPROVED":
      return apiError(
        { code: "POST_NOT_APPROVED", message: "只有已通过审核的帖子才能设为精选" },
        400
      );
    case "PROJECT_NOT_FOUND":
      return apiError({ code: "PROJECT_NOT_FOUND", message: "未找到项目" }, 404);
    case "USER_NOT_FOUND":
      return apiError({ code: "USER_NOT_FOUND", message: "未找到用户" }, 404);
    case "CANNOT_FOLLOW_SELF":
      return apiError({ code: "CANNOT_FOLLOW_SELF", message: "不能关注自己" }, 400);
    case "TEAM_NOT_FOUND":
      return apiError({ code: "TEAM_NOT_FOUND", message: "未找到团队" }, 404);
    case "FORBIDDEN_NOT_OWNER":
      return apiError({ code: "FORBIDDEN", message: "只有团队所有者或管理员可以执行此操作" }, 403);
    case "FORBIDDEN":
      return apiError({ code: "FORBIDDEN", message: "无权执行此操作" }, 403);
    case "MEMBERSHIP_NOT_FOUND":
      return apiError({ code: "MEMBERSHIP_NOT_FOUND", message: "未找到成员关系" }, 404);
    case "CANNOT_REMOVE_OWNER":
      return apiError({ code: "CANNOT_REMOVE_OWNER", message: "不能移除团队所有者" }, 400);
    case "CANNOT_EDIT_OWNER":
      return apiError({ code: "CANNOT_EDIT_OWNER", message: "不能修改团队所有者角色" }, 400);
    case "INVALID_TEAM_ROLE":
      return apiError({ code: "INVALID_TEAM_ROLE", message: "无效的团队角色" }, 400);
    case "API_KEY_NOT_FOUND":
      return apiError({ code: "API_KEY_NOT_FOUND", message: "未找到 API 密钥" }, 404);
    case "WEBHOOK_NOT_FOUND":
      return apiError({ code: "WEBHOOK_NOT_FOUND", message: "未找到 Webhook" }, 404);
    case "ALIPAY_NOT_CONFIGURED":
      return apiError(
        { code: "ALIPAY_NOT_CONFIGURED", message: "支付宝支付当前未配置" },
        503
      );
    case "SLUG_TAKEN":
      return apiError({ code: "SLUG_TAKEN", message: "该标识已被占用" }, 409);
    case "PROFILE_ALREADY_EXISTS":
      return apiError(
        {
          code: "PROFILE_ALREADY_EXISTS",
          message: "你已经创建过创作者资料，请使用 PATCH 更新。",
        },
        409
      );
    case "PROFILE_NOT_FOUND":
      return apiError(
        {
          code: "PROFILE_NOT_FOUND",
          message: "未找到资料，请先使用 POST 创建。",
        },
        404
      );
    case "PARENT_COMMENT_NOT_FOUND":
      return apiError({ code: "PARENT_COMMENT_NOT_FOUND", message: "未找到父级评论" }, 404);
    case "MAX_NESTING_DEPTH_EXCEEDED":
      return apiError(
        {
          code: "MAX_NESTING_DEPTH_EXCEEDED",
          message: "回复嵌套层级最多支持 2 层",
        },
        400
      );
    default:
      return null;
  }
}
