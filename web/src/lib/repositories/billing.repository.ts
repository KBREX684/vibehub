import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockSubscriptions } from "@/lib/data/mock-data";
import { bumpUserSessionVersion } from "@/lib/session-version";
import type { UserSubscription } from "@/lib/types";

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
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  enterpriseStatus?: string | null;
  enterpriseRequestedAt?: Date | null;
  enterpriseReviewedAt?: Date | null;
  enterpriseReviewedBy?: string | null;
  enterpriseOrgName?: string | null;
  enterpriseOrgWebsite?: string | null;
  enterpriseWorkEmail?: string | null;
  enterpriseUseCase?: string | null;
  enterpriseReviewNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserSubscription {
  return {
    id: row.id,
    userId: row.userId,
    tier: (row.tier as UserSubscription["tier"]) ?? "free",
    status: (row.status as UserSubscription["status"]) ?? "active",
    stripeSubscriptionId: row.stripeSubscriptionId ?? undefined,
    stripePriceId: row.stripePriceId ?? undefined,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    enterpriseStatus: (row.enterpriseStatus as UserSubscription["enterpriseStatus"] | undefined) ?? "none",
    enterpriseRequestedAt: row.enterpriseRequestedAt?.toISOString(),
    enterpriseReviewedAt: row.enterpriseReviewedAt?.toISOString(),
    enterpriseReviewedBy: row.enterpriseReviewedBy ?? undefined,
    enterpriseOrgName: row.enterpriseOrgName ?? undefined,
    enterpriseOrgWebsite: row.enterpriseOrgWebsite ?? undefined,
    enterpriseWorkEmail: row.enterpriseWorkEmail ?? undefined,
    enterpriseUseCase: row.enterpriseUseCase ?? undefined,
    enterpriseReviewNote: row.enterpriseReviewNote ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
      cancelAtPeriodEnd: false,
      enterpriseStatus: "none",
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
      cancelAtPeriodEnd: false,
      enterpriseStatus: "none",
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
  enterpriseStatus?: UserSubscription["enterpriseStatus"];
  enterpriseRequestedAt?: Date | null;
  enterpriseReviewedAt?: Date | null;
  enterpriseReviewedBy?: string | null;
  enterpriseOrgName?: string | null;
  enterpriseOrgWebsite?: string | null;
  enterpriseWorkEmail?: string | null;
  enterpriseUseCase?: string | null;
  enterpriseReviewNote?: string | null;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}): Promise<UserSubscription> {
  if (useMockData) {
    const idx = mockSubscriptions.findIndex((s) => s.userId === params.userId);
    const now = new Date().toISOString();
    const row = {
      id: idx >= 0 ? mockSubscriptions[idx].id : `sub_${Date.now()}`,
      userId: params.userId,
      tier: params.tier,
      status: params.status,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      currentPeriodEnd: params.currentPeriodEnd?.toISOString(),
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      enterpriseStatus:
        params.enterpriseStatus ?? (idx >= 0 ? (mockSubscriptions[idx].enterpriseStatus ?? "none") : "none"),
      enterpriseRequestedAt: params.enterpriseRequestedAt?.toISOString(),
      enterpriseReviewedAt: params.enterpriseReviewedAt?.toISOString(),
      enterpriseReviewedBy: params.enterpriseReviewedBy ?? undefined,
      enterpriseOrgName: params.enterpriseOrgName ?? undefined,
      enterpriseOrgWebsite: params.enterpriseOrgWebsite ?? undefined,
      enterpriseWorkEmail: params.enterpriseWorkEmail ?? undefined,
      enterpriseUseCase: params.enterpriseUseCase ?? undefined,
      enterpriseReviewNote: params.enterpriseReviewNote ?? undefined,
      createdAt: idx >= 0 ? mockSubscriptions[idx].createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) mockSubscriptions[idx] = row;
    else mockSubscriptions.push(row);
    void bumpUserSessionVersion(params.userId);
    return {
      ...row,
      tier: row.tier as UserSubscription["tier"],
      status: row.status as UserSubscription["status"],
      enterpriseStatus: (row.enterpriseStatus as UserSubscription["enterpriseStatus"] | undefined) ?? "none",
    };
  }
  const prisma = await getPrisma();
  const data = {
    tier: params.tier as "free" | "pro",
    status: params.status as "active" | "past_due" | "canceled" | "trialing",
    stripeSubscriptionId: params.stripeSubscriptionId ?? null,
    stripePriceId: params.stripePriceId ?? null,
    currentPeriodEnd: params.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    enterpriseStatus: (params.enterpriseStatus ?? "none") as "none" | "pending" | "approved" | "rejected",
    enterpriseRequestedAt: params.enterpriseRequestedAt ?? null,
    enterpriseReviewedAt: params.enterpriseReviewedAt ?? null,
    enterpriseReviewedBy: params.enterpriseReviewedBy ?? null,
    enterpriseOrgName: params.enterpriseOrgName ?? null,
    enterpriseOrgWebsite: params.enterpriseOrgWebsite ?? null,
    enterpriseWorkEmail: params.enterpriseWorkEmail ?? null,
    enterpriseUseCase: params.enterpriseUseCase ?? null,
    enterpriseReviewNote: params.enterpriseReviewNote ?? null,
  };
  const row = await prisma.userSubscription.upsert({
    where: { userId: params.userId },
    update: { ...data, updatedAt: new Date() },
    create: { userId: params.userId, ...data },
  });
  void bumpUserSessionVersion(params.userId);
  return toSubscriptionDto(row);
}

export async function getUserTier(userId: string): Promise<UserSubscription["tier"]> {
  const sub = await getUserSubscription(userId);
  if (sub.status === "active" || sub.status === "trialing") return sub.tier;
  return "free";
}
