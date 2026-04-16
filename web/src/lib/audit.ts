/**
 * G-06: Centralized audit log writer.
 *
 * Provides a single function to write audit trail entries for high-risk operations.
 * Uses the existing AuditLog Prisma model and mock-data fallback pattern.
 */
import { isMockDataEnabled } from "@/lib/runtime-mode";

export type AuditAction =
  | "api_key.created"
  | "api_key.revoked"
  | "session.login"
  | "session.login_magic_link"
  | "session.logout"
  | "admin.action"
  | "team.member_joined"
  | "team.member_removed"
  | "team.join_request_approved"
  | "team.join_request_rejected";

export interface WriteAuditLogParams {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort audit log writer — never throws.
 * In mock mode, logs are pushed to the in-memory mock store.
 * In database mode, writes a row to AuditLog via Prisma.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    if (isMockDataEnabled()) {
      const { mockAuditLogs } = await import("@/lib/data/mock-data");
      mockAuditLogs.unshift({
        id: `audit_${Date.now()}`,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? null,
        createdAt: new Date(),
      });
      return;
    }
    const { prisma } = await import("@/lib/db");
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? null,
      },
    });
  } catch {
    // Best-effort: audit log failure must not break the primary operation
  }
}
