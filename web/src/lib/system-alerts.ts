import { isMockDataEnabled } from "@/lib/runtime-mode";
import { logger, serializeError } from "@/lib/logger";
import { sendTransactionalEmail } from "@/lib/mail";
import { mockSystemAlerts } from "@/lib/data/mock-data";
import type { SystemAlertDeliveryStatus, SystemAlertRecord, SystemAlertSeverity } from "@/lib/types";
import { Prisma } from "@prisma/client";

const DEDUPE_WINDOW_MS = 5 * 60_000;
const useMockData = isMockDataEnabled();

function toRecord(row: {
  id: string;
  kind: string;
  severity: SystemAlertSeverity | string;
  message: string;
  dedupeKey?: string | null;
  metadata?: unknown;
  deliveryStatus: SystemAlertDeliveryStatus | string;
  deliverySummary?: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}): SystemAlertRecord {
  return {
    id: row.id,
    kind: row.kind,
    severity: row.severity as SystemAlertSeverity,
    message: row.message,
    dedupeKey: row.dedupeKey ?? undefined,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    deliveryStatus: row.deliveryStatus as SystemAlertDeliveryStatus,
    deliverySummary: row.deliverySummary ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
  };
}

function nowIso() {
  return new Date().toISOString();
}

async function deliverToFeishu(title: string, text: string): Promise<"sent" | "skipped" | "failed"> {
  const webhook = process.env.FEISHU_ALERT_WEBHOOK_URL?.trim();
  if (!webhook) return "skipped";
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: `${title}\n${text}` },
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? "sent" : "failed";
  } catch (error) {
    logger.warn({ err: serializeError(error) }, "failed to deliver feishu alert");
    return "failed";
  }
}

async function deliverToEmail(title: string, text: string): Promise<"sent" | "skipped" | "failed"> {
  const to = process.env.ALERT_EMAIL_TO?.trim();
  if (!to) return "skipped";
  try {
    const result = await sendTransactionalEmail({
      to,
      subject: `[VibeHub alert] ${title}`,
      text,
    });
    return result.sent ? "sent" : "skipped";
  } catch (error) {
    logger.warn({ err: serializeError(error) }, "failed to deliver email alert");
    return "failed";
  }
}

function summarizeDelivery(outcomes: Array<[string, "sent" | "skipped" | "failed"]>): {
  status: SystemAlertDeliveryStatus;
  summary: string;
} {
  const summary = outcomes.map(([channel, status]) => `${channel}:${status}`).join(", ");
  if (outcomes.some(([, status]) => status === "sent")) {
    return { status: "sent", summary };
  }
  if (outcomes.some(([, status]) => status === "failed")) {
    return { status: "failed", summary };
  }
  return { status: "skipped", summary };
}

async function findRecentByDedupeKey(dedupeKey: string): Promise<SystemAlertRecord | null> {
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);
  if (useMockData) {
    const item = mockSystemAlerts.find(
      (alert) => alert.dedupeKey === dedupeKey && !alert.resolvedAt && new Date(alert.createdAt) >= cutoff
    );
    return item ?? null;
  }
  const { prisma } = await import("@/lib/db");
  const row = await prisma.systemAlert.findFirst({
    where: {
      dedupeKey,
      resolvedAt: null,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });
  return row ? toRecord(row) : null;
}

export async function emitSystemAlert(params: {
  kind: string;
  severity: SystemAlertSeverity;
  message: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<SystemAlertRecord> {
  if (params.dedupeKey) {
    const existing = await findRecentByDedupeKey(params.dedupeKey);
    if (existing) return existing;
  }

  const text = `${params.message}${params.metadata ? `\n\n${JSON.stringify(params.metadata, null, 2)}` : ""}`;
  const [feishu, email] = await Promise.all([
    deliverToFeishu(params.kind, text),
    deliverToEmail(params.kind, text),
  ]);
  const delivery = summarizeDelivery([
    ["feishu", feishu],
    ["email", email],
  ]);

  if (useMockData) {
    const now = nowIso();
    const created: SystemAlertRecord = {
      id: `sys_alert_${Math.random().toString(36).slice(2, 10)}`,
      kind: params.kind,
      severity: params.severity,
      message: params.message,
      dedupeKey: params.dedupeKey,
      metadata: params.metadata,
      deliveryStatus: delivery.status,
      deliverySummary: delivery.summary,
      createdAt: now,
      updatedAt: now,
    };
    mockSystemAlerts.unshift(created);
    return created;
  }

  const { prisma } = await import("@/lib/db");
  const row = await prisma.systemAlert.create({
    data: {
      kind: params.kind,
      severity: params.severity,
      message: params.message,
      dedupeKey: params.dedupeKey,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      deliveryStatus: delivery.status,
      deliverySummary: delivery.summary,
    },
  });
  return toRecord(row);
}

export async function listRecentSystemAlerts(params?: {
  limit?: number;
  severity?: SystemAlertSeverity;
  includeResolved?: boolean;
}): Promise<SystemAlertRecord[]> {
  const limit = Math.max(1, Math.min(params?.limit ?? 10, 100));
  if (useMockData) {
    return mockSystemAlerts
      .filter((item) => (params?.severity ? item.severity === params.severity : true))
      .filter((item) => (params?.includeResolved ? true : !item.resolvedAt))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  const { prisma } = await import("@/lib/db");
  const rows = await prisma.systemAlert.findMany({
    where: {
      severity: params?.severity,
      ...(params?.includeResolved ? {} : { resolvedAt: null }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toRecord);
}
