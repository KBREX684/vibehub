import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { WEBHOOK_EVENT_NAMES } from "@/lib/webhook-events";
import {
  deleteUserAutomationWorkflow,
  updateUserAutomationWorkflow,
} from "@/lib/workflow-automation";
import type { AutomationWorkflowActionType } from "@/lib/types";

const ACTION_TYPES = [
  "create_team_task",
  "create_team_discussion",
  "agent_complete_team_task",
  "agent_submit_task_review",
  "request_team_task_delete",
  "request_team_member_role_change",
  "send_slack_message",
  "send_discord_message",
  "send_feishu_message",
  "trigger_github_repository_dispatch",
] as const;

const stepSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  config: z.record(z.string(), z.unknown()),
});

const bodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  triggerEvent: z.enum(WEBHOOK_EVENT_NAMES).optional(),
  filterJson: z.record(z.string(), z.unknown()).nullable().optional(),
  active: z.boolean().optional(),
  agentBindingId: z.string().nullable().optional(),
  steps: z.array(stepSchema).min(1).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const { workflowId } = await params;
    const json = await request.json();
    const body = bodySchema.parse(json);
    const workflow = await updateUserAutomationWorkflow({
      userId: session.userId,
      workflowId,
      ...body,
      steps: body.steps?.map((step) => ({
        actionType: step.actionType as AutomationWorkflowActionType,
        config: step.config,
      })),
    });
    return apiSuccess({ workflow });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid automation payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "AUTOMATION_UPDATE_FAILED", message: "Failed to update automation", details: safeServerErrorDetails(error) }, 500);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const { workflowId } = await params;
    await deleteUserAutomationWorkflow({ userId: session.userId, workflowId });
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError({ code: "AUTOMATION_DELETE_FAILED", message: "Failed to delete automation", details: safeServerErrorDetails(error) }, 500);
  }
}
