import { Prisma } from "@prisma/client";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockBillingRecords, mockSubscriptions } from "@/lib/data/mock-data";
import type { BillingRecord, PaymentProviderKind, UserSubscription } from "@/lib/types";
import { resolveEntitledTier } from "@/lib/subscription";

const useMockData = isMockDataEnabled();

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function toSubscriptionDto(row: {
  id: string;
  userId: string;
  tier: string;
  status: string;
  paymentProvider?: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserSubscription {
  return {
    id: row.id,
    userId: row.userId,
    tier: (row.tier as UserSubscription["tier"]) ?? "free",
    status: (row.status as UserSubscription["status"]) ?? "active",
    paymentProvider: (row.paymentProvider as UserSubscription["paymentProvider"]) ?? "alipay",
    currentPeriodEnd: row.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBillingRecordDto(row: {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  paymentProvider: string;
  tier: string;
  status: string;
  amountCents: number;
  currency: string;
  externalSessionId?: string | null;
  externalPaymentId?: string | null;
  description?: string | null;
  failureReason?: string | null;
  metadata?: unknown;
  settledAt?: Date | string | null;
  refundedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): BillingRecord {
  return {
    id: row.id,
    userId: row.userId,
    subscriptionId: row.subscriptionId ?? undefined,
    paymentProvider: row.paymentProvider as PaymentProviderKind,
    tier: row.tier as BillingRecord["tier"],
    status: row.status as BillingRecord["status"],
    amountCents: row.amountCents,
    currency: row.currency,
    externalSessionId: row.externalSessionId ?? undefined,
    externalPaymentId: row.externalPaymentId ?? undefined,
    description: row.description ?? undefined,
    failureReason: row.failureReason ?? undefined,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
    settledAt:
      row.settledAt instanceof Date
        ? row.settledAt.toISOString()
        : typeof row.settledAt === "string"
          ? row.settledAt
          : undefined,
    refundedAt:
      row.refundedAt instanceof Date
        ? row.refundedAt.toISOString()
        : typeof row.refundedAt === "string"
          ? row.refundedAt
          : undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  if (useMockData) {
    const existing = mockSubscriptions.find((s) => s.userId === userId);
    if (existing) {
      return {
        ...existing,
        tier: existing.tier as UserSubscription["tier"],
        status: existing.status as UserSubscription["status"],
        enterpriseStatus:
          (existing.enterpriseStatus as UserSubscription["enterpriseStatus"] | undefined) ?? "none",
      };
    }
    return {
      id: `sub_free_${userId}`,
      userId,
      tier: "free",
      status: "active",
      paymentProvider: "alipay",
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const prisma = await getPrisma();
  const row = await prisma.userSubscription.findUnique({ where: { userId } });
  if (!row) {
    return {
      id: `sub_free_${userId}`,
      userId,
      tier: "free",
      status: "active",
      paymentProvider: "alipay",
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return toSubscriptionDto(row);
}

export async function upsertUserSubscription(params: {
  userId: string;
  tier: UserSubscription["tier"];
  status: UserSubscription["status"];
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  paymentProvider?: UserSubscription["paymentProvider"];
}): Promise<UserSubscription> {
  if (useMockData) {
    const idx = mockSubscriptions.findIndex((s) => s.userId === params.userId);
    const now = new Date().toISOString();
    const row = {
      id: idx >= 0 ? mockSubscriptions[idx].id : `sub_${Date.now()}`,
      userId: params.userId,
      tier: params.tier,
      status: params.status,
      paymentProvider: params.paymentProvider ?? "alipay",
      currentPeriodEnd: params.currentPeriodEnd?.toISOString(),
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      createdAt: idx >= 0 ? mockSubscriptions[idx].createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) mockSubscriptions[idx] = row;
    else mockSubscriptions.push(row);
    return {
      ...row,
      tier: row.tier as UserSubscription["tier"],
      status: row.status as UserSubscription["status"],
    };
  }
  const prisma = await getPrisma();
  const data = {
    tier: params.tier as "free" | "pro",
    status: params.status as "active" | "past_due" | "canceled" | "trialing",
    paymentProvider: (params.paymentProvider ?? "alipay") as "alipay",
    currentPeriodEnd: params.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
  };
  const row = await prisma.userSubscription.upsert({
    where: { userId: params.userId },
    update: { ...data, updatedAt: new Date() },
    create: { userId: params.userId, ...data },
  });
  return toSubscriptionDto(row);
}

export async function getUserTier(userId: string): Promise<UserSubscription["tier"]> {
  const sub = await getUserSubscription(userId);
  return resolveEntitledTier(sub);
}

export async function listBillingRecordsForUser(userId: string, limit = 20): Promise<BillingRecord[]> {
  if (useMockData) {
    return mockBillingRecords
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((record) => toBillingRecordDto(record));
  }
  const prisma = await getPrisma();
  const rows = await prisma.billingRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => toBillingRecordDto(row));
}

export async function getBillingRecordByIdForUser(params: {
  recordId: string;
  userId: string;
}): Promise<BillingRecord | null> {
  if (useMockData) {
    const row = mockBillingRecords.find((record) => record.id === params.recordId && record.userId === params.userId);
    return row ? toBillingRecordDto(row) : null;
  }
  const prisma = await getPrisma();
  const row = await prisma.billingRecord.findFirst({
    where: { id: params.recordId, userId: params.userId },
  });
  return row ? toBillingRecordDto(row) : null;
}

export async function getBillingRecordByExternalSessionId(params: {
  paymentProvider: PaymentProviderKind;
  externalSessionId: string;
}): Promise<BillingRecord | null> {
  if (useMockData) {
    const row = mockBillingRecords.find(
      (record) =>
        record.paymentProvider === params.paymentProvider && record.externalSessionId === params.externalSessionId
    );
    return row ? toBillingRecordDto(row) : null;
  }
  const prisma = await getPrisma();
  const row = await prisma.billingRecord.findFirst({
    where: {
      paymentProvider: params.paymentProvider,
      externalSessionId: params.externalSessionId,
    },
    orderBy: { createdAt: "desc" },
  });
  return row ? toBillingRecordDto(row) : null;
}

export async function createBillingRecord(params: {
  userId: string;
  subscriptionId?: string;
  paymentProvider: PaymentProviderKind;
  tier: BillingRecord["tier"];
  amountCents: number;
  currency: string;
  status?: BillingRecord["status"];
  externalSessionId?: string;
  externalPaymentId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  settledAt?: Date;
  refundedAt?: Date;
}): Promise<BillingRecord> {
  if (useMockData) {
    const now = new Date().toISOString();
    const row = {
      id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      paymentProvider: params.paymentProvider,
      tier: params.tier,
      status: params.status ?? "pending",
      amountCents: params.amountCents,
      currency: params.currency,
      externalSessionId: params.externalSessionId,
      externalPaymentId: params.externalPaymentId,
      description: params.description,
      metadata: params.metadata,
      settledAt: params.settledAt?.toISOString(),
      refundedAt: params.refundedAt?.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    mockBillingRecords.unshift(row);
    return toBillingRecordDto(row);
  }
  const prisma = await getPrisma();
  const row = await prisma.billingRecord.create({
    data: {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      paymentProvider: params.paymentProvider,
      tier: params.tier,
      status: params.status ?? "pending",
      amountCents: params.amountCents,
      currency: params.currency,
      externalSessionId: params.externalSessionId,
      externalPaymentId: params.externalPaymentId,
      description: params.description,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      settledAt: params.settledAt,
      refundedAt: params.refundedAt,
    },
  });
  return toBillingRecordDto(row);
}

export async function updateBillingRecordStatus(params: {
  recordId: string;
  userId?: string;
  status: BillingRecord["status"];
  externalPaymentId?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  settledAt?: Date | null;
  refundedAt?: Date | null;
}): Promise<BillingRecord> {
  if (useMockData) {
    const row = mockBillingRecords.find(
      (record) => record.id === params.recordId && (!params.userId || record.userId === params.userId)
    );
    if (!row) {
      throw new Error("BILLING_RECORD_NOT_FOUND");
    }
    row.status = params.status;
    row.externalPaymentId = params.externalPaymentId ?? row.externalPaymentId;
    row.failureReason = params.failureReason ?? row.failureReason;
    row.metadata = params.metadata ?? row.metadata;
    row.settledAt = params.settledAt ? params.settledAt.toISOString() : row.settledAt;
    row.refundedAt = params.refundedAt ? params.refundedAt.toISOString() : row.refundedAt;
    row.updatedAt = new Date().toISOString();
    return toBillingRecordDto(row);
  }
  const prisma = await getPrisma();
  const row = await prisma.billingRecord.findFirst({
    where: { id: params.recordId, ...(params.userId ? { userId: params.userId } : {}) },
  });
  if (!row) {
    throw new Error("BILLING_RECORD_NOT_FOUND");
  }
  const updated = await prisma.billingRecord.update({
    where: { id: row.id },
    data: {
      status: params.status,
      externalPaymentId: params.externalPaymentId ?? undefined,
      failureReason: params.failureReason ?? undefined,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      settledAt: params.settledAt ?? undefined,
      refundedAt: params.refundedAt ?? undefined,
    },
  });
  return toBillingRecordDto(updated);
}
