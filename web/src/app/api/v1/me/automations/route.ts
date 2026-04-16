import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { WEBHOOK_EVENT_NAMES } from "@/lib/webhook-events";
import {
  createUserAutomationWorkflow,
  listUserAutomationWorkflows,
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
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  triggerEvent: z.enum(WEBHOOK_EVENT_NAMES),
  filterJson: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().optional(),
  agentBindingId: z.string().optional(),
  steps: z.array(stepSchema).min(1),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const workflows = await listUserAutomationWorkflows(session.userId);
    return apiSuccess({ workflows });
  } catch (error) {
    return apiError({ code: "AUTOMATIONS_LIST_FAILED", message: "Failed to list automations", details: safeServerErrorDetails(error) }, 500);
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const workflow = await createUserAutomationWorkflow({
      userId: session.userId,
      ...body,
      steps: body.steps.map((step) => ({
        actionType: step.actionType as AutomationWorkflowActionType,
        config: step.config,
      })),
    });
    return apiSuccess({ workflow }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid automation payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "AUTOMATION_CREATE_FAILED", message: "Failed to create automation", details: safeServerErrorDetails(error) }, 500);
  }
}
