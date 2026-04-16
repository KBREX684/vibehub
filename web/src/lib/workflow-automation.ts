import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { WEBHOOK_EVENT_NAMES, isWebhookEventName, type WebhookEventName } from "@/lib/webhook-events";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { getPrisma } from "@/lib/repository";
import { assertPublicHttpsUrl } from "@/lib/private-network-url";
import { logger } from "@/lib/logger";
import { mockAgentBindings } from "@/lib/data/mock-agent-bindings";
import {
  mockAutomationWorkflowRuns,
  mockAutomationWorkflows,
  mockAutomationWorkflowSteps,
} from "@/lib/data/mock-data";
import type {
  AutomationWorkflowActionType,
  AutomationWorkflowRunSummary,
  AutomationWorkflowSummary,
  AutomationWorkflowStepSummary,
} from "@/lib/types";

type WorkflowStepConfig = Record<string, unknown>;

const ACTION_TYPES: readonly AutomationWorkflowActionType[] = [
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

function ensureActionType(value: string): AutomationWorkflowActionType {
  if ((ACTION_TYPES as readonly string[]).includes(value)) return value as AutomationWorkflowActionType;
  throw new Error("INVALID_AUTOMATION_ACTION_TYPE");
}

function toStepSummary(row: {
  id: string;
  sortOrder: number;
  actionType: string;
  config: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}): AutomationWorkflowStepSummary {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    actionType: row.actionType as AutomationWorkflowActionType,
    config: (row.config as Record<string, unknown>) ?? {},
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

function toWorkflowSummary(
  row: {
    id: string;
    userId: string;
    agentBindingId?: string | null | undefined;
    name: string;
    description?: string | null | undefined;
    triggerEvent: string;
    filterJson?: unknown;
    active: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
  steps: AutomationWorkflowStepSummary[],
  agentBindingLabel?: string
): AutomationWorkflowSummary {
  return {
    id: row.id,
    userId: row.userId,
    agentBindingId: row.agentBindingId ?? undefined,
    agentBindingLabel,
    name: row.name,
    description: row.description ?? undefined,
    triggerEvent: row.triggerEvent,
    filterJson: (row.filterJson as Record<string, unknown> | null) ?? undefined,
    active: row.active,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    steps,
  };
}

function toRunSummary(
  row: {
    id: string;
    workflowId: string;
    userId: string;
    event: string;
    status: string;
    triggerPayload?: unknown;
    resultSummary?: string | null | undefined;
    createdAt: Date | string;
    completedAt?: Date | string | null | undefined;
  },
  workflowName?: string
): AutomationWorkflowRunSummary {
  return {
    id: row.id,
    workflowId: row.workflowId,
    workflowName,
    userId: row.userId,
    event: row.event,
    status: row.status as AutomationWorkflowRunSummary["status"],
    triggerPayload: (row.triggerPayload as Record<string, unknown> | null) ?? undefined,
    resultSummary: row.resultSummary ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    completedAt:
      row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : row.completedAt ?? undefined,
  };
}

function interpolateString(
  value: string,
  context: { event: string; userId: string; payload: Record<string, unknown>; workflowName?: string; runId?: string }
): string {
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, token: string) => {
    const path = token.trim().split(".");
    let current: unknown = context as unknown;
    for (const segment of path) {
      if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        current = "";
        break;
      }
    }
    return typeof current === "string" || typeof current === "number" || typeof current === "boolean"
      ? String(current)
      : "";
  });
}

function resolveValue(
  input: unknown,
  context: { event: string; userId: string; payload: Record<string, unknown>; workflowName?: string; runId?: string }
): unknown {
  if (typeof input === "string") return interpolateString(input, context);
  if (Array.isArray(input)) return input.map((item) => resolveValue(item, context));
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, resolveValue(value, context)])
    );
  }
  return input;
}

function matchFilter(filter: Record<string, unknown> | undefined, payload: Record<string, unknown>): boolean {
  if (!filter) return true;
  for (const [key, expected] of Object.entries(filter)) {
    if (payload[key] !== expected) return false;
  }
  return true;
}

export async function listUserAutomationWorkflows(userId: string): Promise<AutomationWorkflowSummary[]> {
  if (isMockDataEnabled()) {
    return mockAutomationWorkflows
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) =>
        toWorkflowSummary(
          row,
          mockAutomationWorkflowSteps
            .filter((step) => step.workflowId === row.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(toStepSummary),
          row.agentBindingId
            ? mockAgentBindings.find((binding) => binding.id === row.agentBindingId && binding.userId === userId)?.label
            : undefined
        )
      );
  }

  const prisma = await getPrisma();
  const rows = await prisma.automationWorkflow.findMany({
    where: { userId },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      agentBinding: { select: { label: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) =>
    toWorkflowSummary(row, row.steps.map(toStepSummary), row.agentBinding?.label)
  );
}

export async function listUserAutomationRuns(userId: string): Promise<AutomationWorkflowRunSummary[]> {
  if (isMockDataEnabled()) {
    return mockAutomationWorkflowRuns
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) =>
        toRunSummary(
          row,
          mockAutomationWorkflows.find((workflow) => workflow.id === row.workflowId)?.name
        )
      );
  }

  const prisma = await getPrisma();
  const rows = await prisma.automationWorkflowRun.findMany({
    where: { userId },
    include: { workflow: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => toRunSummary(row, row.workflow.name));
}

export async function createUserAutomationWorkflow(params: {
  userId: string;
  agentBindingId?: string;
  name: string;
  description?: string;
  triggerEvent: WebhookEventName;
  filterJson?: Record<string, unknown>;
  active?: boolean;
  steps: Array<{ actionType: AutomationWorkflowActionType; config: WorkflowStepConfig }>;
}): Promise<AutomationWorkflowSummary> {
  const name = params.name.trim().slice(0, 80);
  if (!name) throw new Error("INVALID_AUTOMATION_WORKFLOW_NAME");
  if (!isWebhookEventName(params.triggerEvent)) throw new Error("INVALID_AUTOMATION_TRIGGER_EVENT");
  if (!params.steps.length) throw new Error("AUTOMATION_STEPS_REQUIRED");
  const description = params.description?.trim().slice(0, 500) || undefined;
  const now = new Date().toISOString();

  if (isMockDataEnabled()) {
    if (params.agentBindingId) {
      const binding = mockAgentBindings.find((item) => item.id === params.agentBindingId && item.userId === params.userId && item.active);
      if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
    }
    const workflowId = `wf_${Date.now()}_${randomBytes(3).toString("hex")}`;
    mockAutomationWorkflows.unshift({
      id: workflowId,
      userId: params.userId,
      agentBindingId: params.agentBindingId,
      name,
      description,
      triggerEvent: params.triggerEvent,
      filterJson: params.filterJson,
      active: params.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
    params.steps.forEach((step, index) => {
      mockAutomationWorkflowSteps.push({
        id: `wf_step_${workflowId}_${index}`,
        workflowId,
        sortOrder: index,
        actionType: step.actionType,
        config: step.config,
        createdAt: now,
        updatedAt: now,
      });
    });
    const bindingLabel = params.agentBindingId
      ? mockAgentBindings.find((item) => item.id === params.agentBindingId)?.label
      : undefined;
    return toWorkflowSummary(
      mockAutomationWorkflows[0]!,
      mockAutomationWorkflowSteps.filter((item) => item.workflowId === workflowId).sort((a, b) => a.sortOrder - b.sortOrder).map(toStepSummary),
      bindingLabel
    );
  }

  const prisma = await getPrisma();
  if (params.agentBindingId) {
    const binding = await prisma.agentBinding.findFirst({
      where: { id: params.agentBindingId, userId: params.userId, active: true },
      select: { id: true, label: true },
    });
    if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
  }
  const row = await prisma.automationWorkflow.create({
    data: {
      userId: params.userId,
      agentBindingId: params.agentBindingId ?? null,
      name,
      description: description ?? null,
      triggerEvent: params.triggerEvent,
      filterJson: params.filterJson as Prisma.InputJsonValue | undefined,
      active: params.active ?? true,
      steps: {
        create: params.steps.map((step, index) => ({
          sortOrder: index,
          actionType: ensureActionType(step.actionType),
          config: step.config as Prisma.InputJsonValue,
        })),
      },
    },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      agentBinding: { select: { label: true } },
    },
  });
  return toWorkflowSummary(row, row.steps.map(toStepSummary), row.agentBinding?.label);
}

export async function updateUserAutomationWorkflow(params: {
  userId: string;
  workflowId: string;
  name?: string;
  description?: string | null;
  agentBindingId?: string | null;
  triggerEvent?: WebhookEventName;
  filterJson?: Record<string, unknown> | null;
  active?: boolean;
  steps?: Array<{ actionType: AutomationWorkflowActionType; config: WorkflowStepConfig }>;
}): Promise<AutomationWorkflowSummary> {
  if (params.triggerEvent && !isWebhookEventName(params.triggerEvent)) throw new Error("INVALID_AUTOMATION_TRIGGER_EVENT");
  if (isMockDataEnabled()) {
    const row = mockAutomationWorkflows.find((item) => item.id === params.workflowId && item.userId === params.userId);
    if (!row) throw new Error("AUTOMATION_WORKFLOW_NOT_FOUND");
    if (params.name !== undefined) {
      const name = params.name.trim().slice(0, 80);
      if (!name) throw new Error("INVALID_AUTOMATION_WORKFLOW_NAME");
      row.name = name;
    }
    if (params.description !== undefined) row.description = params.description?.trim().slice(0, 500);
    if (params.agentBindingId !== undefined) row.agentBindingId = params.agentBindingId ?? undefined;
    if (params.triggerEvent !== undefined) row.triggerEvent = params.triggerEvent;
    if (params.filterJson !== undefined) row.filterJson = params.filterJson ?? undefined;
    if (params.active !== undefined) row.active = params.active;
    row.updatedAt = new Date().toISOString();
    if (params.steps) {
      for (let i = mockAutomationWorkflowSteps.length - 1; i >= 0; i--) {
        if (mockAutomationWorkflowSteps[i].workflowId === row.id) mockAutomationWorkflowSteps.splice(i, 1);
      }
      params.steps.forEach((step, index) => {
        mockAutomationWorkflowSteps.push({
          id: `wf_step_${row.id}_${index}_${Date.now()}`,
          workflowId: row.id,
          sortOrder: index,
          actionType: step.actionType,
          config: step.config,
          createdAt: row.updatedAt,
          updatedAt: row.updatedAt,
        });
      });
    }
    return toWorkflowSummary(
      row,
      mockAutomationWorkflowSteps.filter((item) => item.workflowId === row.id).sort((a, b) => a.sortOrder - b.sortOrder).map(toStepSummary),
      row.agentBindingId ? mockAgentBindings.find((binding) => binding.id === row.agentBindingId)?.label : undefined
    );
  }

  const prisma = await getPrisma();
  const existing = await prisma.automationWorkflow.findFirst({
    where: { id: params.workflowId, userId: params.userId },
    select: { id: true },
  });
  if (!existing) throw new Error("AUTOMATION_WORKFLOW_NOT_FOUND");
  if (params.agentBindingId) {
    const binding = await prisma.agentBinding.findFirst({
      where: { id: params.agentBindingId, userId: params.userId, active: true },
      select: { id: true },
    });
    if (!binding) throw new Error("AGENT_BINDING_NOT_FOUND");
  }
  const data: Prisma.AutomationWorkflowUpdateInput = {};
  if (params.name !== undefined) {
    const name = params.name.trim().slice(0, 80);
    if (!name) throw new Error("INVALID_AUTOMATION_WORKFLOW_NAME");
    data.name = name;
  }
  if (params.description !== undefined) data.description = params.description?.trim().slice(0, 500) ?? null;
  if (params.agentBindingId !== undefined) {
    data.agentBinding = params.agentBindingId ? { connect: { id: params.agentBindingId } } : { disconnect: true };
  }
  if (params.triggerEvent !== undefined) data.triggerEvent = params.triggerEvent;
  if (params.filterJson !== undefined) data.filterJson = (params.filterJson ?? Prisma.JsonNull) as Prisma.InputJsonValue;
  if (params.active !== undefined) data.active = params.active;
  const updated = await prisma.$transaction(async (tx) => {
    const workflow = await tx.automationWorkflow.update({
      where: { id: existing.id },
      data,
    });
    if (params.steps) {
      await tx.automationWorkflowStep.deleteMany({ where: { workflowId: existing.id } });
      if (params.steps.length > 0) {
        await tx.automationWorkflowStep.createMany({
          data: params.steps.map((step, index) => ({
            workflowId: existing.id,
            sortOrder: index,
            actionType: ensureActionType(step.actionType),
            config: step.config as Prisma.InputJsonValue,
          })),
        });
      }
    }
    return workflow;
  });
  const full = await prisma.automationWorkflow.findUnique({
    where: { id: updated.id },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      agentBinding: { select: { label: true } },
    },
  });
  if (!full) throw new Error("AUTOMATION_WORKFLOW_NOT_FOUND");
  return toWorkflowSummary(full, full.steps.map(toStepSummary), full.agentBinding?.label);
}

export async function deleteUserAutomationWorkflow(params: { userId: string; workflowId: string }): Promise<void> {
  if (isMockDataEnabled()) {
    const index = mockAutomationWorkflows.findIndex((item) => item.id === params.workflowId && item.userId === params.userId);
    if (index < 0) throw new Error("AUTOMATION_WORKFLOW_NOT_FOUND");
    mockAutomationWorkflows.splice(index, 1);
    for (let i = mockAutomationWorkflowSteps.length - 1; i >= 0; i--) {
      if (mockAutomationWorkflowSteps[i].workflowId === params.workflowId) mockAutomationWorkflowSteps.splice(i, 1);
    }
    return;
  }
  const prisma = await getPrisma();
  const existing = await prisma.automationWorkflow.findFirst({
    where: { id: params.workflowId, userId: params.userId },
    select: { id: true },
  });
  if (!existing) throw new Error("AUTOMATION_WORKFLOW_NOT_FOUND");
  await prisma.automationWorkflow.delete({ where: { id: existing.id } });
}

async function createRun(workflowId: string, userId: string, event: string, triggerPayload: Record<string, unknown>): Promise<string> {
  const now = new Date().toISOString();
  if (isMockDataEnabled()) {
    const id = `wf_run_${Date.now()}_${randomBytes(3).toString("hex")}`;
    mockAutomationWorkflowRuns.unshift({
      id,
      workflowId,
      userId,
      event,
      status: "running",
      triggerPayload,
      createdAt: now,
    });
    return id;
  }
  const prisma = await getPrisma();
  const row = await prisma.automationWorkflowRun.create({
    data: {
      workflowId,
      userId,
      event,
      status: "running",
      triggerPayload: triggerPayload as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return row.id;
}

async function finishRun(runId: string, status: AutomationWorkflowRunSummary["status"], resultSummary?: string) {
  const completedAt = new Date().toISOString();
  if (isMockDataEnabled()) {
    const row = mockAutomationWorkflowRuns.find((item) => item.id === runId);
    if (!row) return;
    row.status = status;
    row.resultSummary = resultSummary;
    row.completedAt = completedAt;
    return;
  }
  const prisma = await getPrisma();
  await prisma.automationWorkflowRun.update({
    where: { id: runId },
    data: { status, resultSummary: resultSummary ?? null, completedAt: new Date() },
  });
}

async function executeOutboundWebhook(url: string, body: Record<string, unknown>) {
  assertPublicHttpsUrl(url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`AUTOMATION_HTTP_${response.status}`);
  }
}

async function runWorkflowStep(params: {
  userId: string;
  agentBindingId?: string;
  step: AutomationWorkflowStepSummary;
  context: { event: string; userId: string; payload: Record<string, unknown>; workflowName?: string; runId?: string };
}) {
  const resolved = resolveValue(params.step.config, params.context) as Record<string, unknown>;
  switch (params.step.actionType) {
    case "create_team_task": {
      const repo = await import("@/lib/repository");
      await repo.createTeamTask({
        teamSlug: String(resolved.teamSlug ?? ""),
        actorUserId: params.userId,
        title: String(resolved.title ?? ""),
        description: typeof resolved.description === "string" ? resolved.description : undefined,
        status: typeof resolved.status === "string" ? (resolved.status as never) : undefined,
        assigneeUserId: typeof resolved.assigneeUserId === "string" ? resolved.assigneeUserId : undefined,
        milestoneId: typeof resolved.milestoneId === "string" ? resolved.milestoneId : undefined,
      });
      return "task created";
    }
    case "create_team_discussion": {
      const repo = await import("@/lib/repository");
      await repo.createTeamDiscussion({
        teamSlug: String(resolved.teamSlug ?? ""),
        actorUserId: params.userId,
        title: String(resolved.title ?? ""),
        body: String(resolved.body ?? ""),
      });
      return "discussion created";
    }
    case "agent_complete_team_task": {
      if (!params.agentBindingId) throw new Error("AUTOMATION_AGENT_BINDING_REQUIRED");
      const repo = await import("@/lib/repository");
      await repo.agentCompleteTeamTask({
        teamSlug: String(resolved.teamSlug ?? ""),
        taskId: String(resolved.taskId ?? ""),
        actorUserId: params.userId,
        agentBindingId: params.agentBindingId,
      });
      return "task moved to review";
    }
    case "agent_submit_task_review": {
      if (!params.agentBindingId) throw new Error("AUTOMATION_AGENT_BINDING_REQUIRED");
      const repo = await import("@/lib/repository");
      await repo.requestAgentTaskReview({
        teamSlug: String(resolved.teamSlug ?? ""),
        taskId: String(resolved.taskId ?? ""),
        actorUserId: params.userId,
        agentBindingId: params.agentBindingId,
        approved: Boolean(resolved.approved),
        reviewNote: typeof resolved.reviewNote === "string" ? resolved.reviewNote : undefined,
      });
      return "review confirmation requested";
    }
    case "request_team_task_delete": {
      if (!params.agentBindingId) throw new Error("AUTOMATION_AGENT_BINDING_REQUIRED");
      const repo = await import("@/lib/repository");
      await repo.requestAgentTaskDelete({
        teamSlug: String(resolved.teamSlug ?? ""),
        taskId: String(resolved.taskId ?? ""),
        actorUserId: params.userId,
        agentBindingId: params.agentBindingId,
        reason: typeof resolved.reason === "string" ? resolved.reason : undefined,
      });
      return "task delete confirmation requested";
    }
    case "request_team_member_role_change": {
      if (!params.agentBindingId) throw new Error("AUTOMATION_AGENT_BINDING_REQUIRED");
      const repo = await import("@/lib/repository");
      await repo.requestAgentTeamMemberRoleChange({
        teamSlug: String(resolved.teamSlug ?? ""),
        memberUserId: String(resolved.memberUserId ?? ""),
        nextRole: String(resolved.nextRole ?? "member") as never,
        actorUserId: params.userId,
        agentBindingId: params.agentBindingId,
        reason: typeof resolved.reason === "string" ? resolved.reason : undefined,
      });
      return "role change confirmation requested";
    }
    case "send_slack_message": {
      await executeOutboundWebhook(String(resolved.webhookUrl ?? ""), {
        text: String(resolved.text ?? ""),
      });
      return "slack message sent";
    }
    case "send_discord_message": {
      await executeOutboundWebhook(String(resolved.webhookUrl ?? ""), {
        content: String(resolved.content ?? resolved.text ?? ""),
      });
      return "discord message sent";
    }
    case "send_feishu_message": {
      await executeOutboundWebhook(String(resolved.webhookUrl ?? ""), {
        msg_type: "text",
        content: { text: String(resolved.text ?? "") },
      });
      return "feishu message sent";
    }
    case "trigger_github_repository_dispatch": {
      const owner = String(resolved.owner ?? "");
      const repo = String(resolved.repo ?? "");
      const token = String(resolved.token ?? "");
      const eventType = String(resolved.eventType ?? "vibehub_event");
      if (!owner || !repo || !token) throw new Error("AUTOMATION_GITHUB_CONFIG_REQUIRED");
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: eventType,
          client_payload: (resolved.clientPayload as Record<string, unknown>) ?? params.context.payload,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`AUTOMATION_GITHUB_${response.status}`);
      return "github repository_dispatch triggered";
    }
  }
}

export async function dispatchAutomationWorkflows(
  userId: string,
  event: WebhookEventName,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const workflows = await listUserAutomationWorkflows(userId);
    for (const workflow of workflows) {
      if (!workflow.active || workflow.triggerEvent !== event) continue;
      if (!matchFilter(workflow.filterJson, payload)) continue;
      const runId = await createRun(workflow.id, userId, event, payload);
      const stepSummaries: string[] = [];
      try {
        for (const step of workflow.steps) {
          const result = await runWorkflowStep({
            userId,
            agentBindingId: workflow.agentBindingId,
            step,
            context: { event, userId, payload, workflowName: workflow.name, runId },
          });
          stepSummaries.push(`${step.actionType}:${result}`);
        }
        await finishRun(runId, "succeeded", stepSummaries.join(" | "));
      } catch (error) {
        const summary = error instanceof Error ? error.message : String(error);
        await finishRun(runId, "failed", summary);
      }
    }
  } catch (error) {
    logger.error({ err: error, userId, event }, "dispatchAutomationWorkflows failed");
  }
}

export { WEBHOOK_EVENT_NAMES };
