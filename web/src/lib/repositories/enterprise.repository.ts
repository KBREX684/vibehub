import { Prisma } from "@prisma/client";
import { paginateArray } from "@/lib/pagination";
import {
  enterpriseProfileSelect,
  enterpriseRowForProfileDto,
} from "@/lib/enterprise-profile-db";
import {
  mockAuditLogs,
  mockEnterpriseProfiles,
  type MockEnterpriseProfile,
} from "@/lib/data/mock-data";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import type {
  EnterpriseProfile,
  EnterpriseVerificationStatus,
} from "@/lib/types";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

const useMockData = isMockDataEnabled();

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function toEnterpriseProfileDto(row: {
  userId: string;
  status: string;
  organizationName: string;
  organizationWebsite: string;
  workEmail: string;
  useCase?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): EnterpriseProfile {
  return {
    userId: row.userId,
    status: (row.status as EnterpriseVerificationStatus) ?? "none",
    organizationName: row.organizationName,
    organizationWebsite: row.organizationWebsite,
    workEmail: row.workEmail,
    useCase: row.useCase ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewNote: row.reviewNote ?? undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

function toEnterpriseProfileFromUser(row: {
  id: string;
  email: string;
  enterpriseProfile?: {
    status: "none" | "pending" | "approved" | "rejected";
    organization: string | null;
    website: string | null;
    useCase: string | null;
    reviewedBy: string | null;
    reviewNote: string | null;
    appliedAt: Date | null;
    reviewedAt: Date | null;
  } | null;
}): EnterpriseProfile {
  const ep = row.enterpriseProfile;
  const mapped = enterpriseRowForProfileDto(row.id, row.email, ep ?? undefined);
  return {
    userId: mapped.id,
    status: mapped.enterpriseStatus,
    organizationName: mapped.enterpriseOrganization ?? "",
    organizationWebsite: mapped.enterpriseWebsite ?? "",
    workEmail: mapped.email,
    useCase: mapped.enterpriseUseCase ?? undefined,
    reviewedBy: mapped.enterpriseReviewedBy ?? undefined,
    reviewNote: mapped.enterpriseReviewNote ?? undefined,
    createdAt: mapped.enterpriseAppliedAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAt:
      mapped.enterpriseReviewedAt?.toISOString() ??
      mapped.enterpriseAppliedAt?.toISOString() ??
      new Date(0).toISOString(),
  };
}

export async function getEnterpriseProfileByUserId(userId: string): Promise<EnterpriseProfile | null> {
  if (useMockData) {
    const row = mockEnterpriseProfiles.find((p) => p.userId === userId);
    return row ? toEnterpriseProfileDto(row) : null;
  }
  const prisma = await getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  return row ? toEnterpriseProfileFromUser(row) : null;
}

export async function submitEnterpriseVerification(params: {
  userId: string;
  organizationName: string;
  organizationWebsite: string;
  workEmail: string;
  useCase?: string;
}): Promise<EnterpriseProfile> {
  const organizationName = params.organizationName.trim();
  const organizationWebsite = params.organizationWebsite.trim();
  const workEmail = params.workEmail.trim().toLowerCase();
  const useCase = params.useCase?.trim() || undefined;

  if (!organizationName || organizationName.length < 2) throw new Error("INVALID_ORGANIZATION_NAME");
  if (!/^https?:\/\//i.test(organizationWebsite)) throw new Error("INVALID_ORGANIZATION_WEBSITE");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) throw new Error("INVALID_WORK_EMAIL");

  if (useMockData) {
    const now = new Date().toISOString();
    const idx = mockEnterpriseProfiles.findIndex((p) => p.userId === params.userId);
    const existing = idx >= 0 ? mockEnterpriseProfiles[idx] : null;
    if (existing && existing.status === "approved") throw new Error("ENTERPRISE_ALREADY_APPROVED");
    const row: MockEnterpriseProfile = {
      id: existing?.id ?? `ep_${Date.now()}`,
      userId: params.userId,
      status: "pending",
      organizationName,
      organizationWebsite,
      workEmail,
      useCase,
      reviewedBy: undefined,
      reviewNote: undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (idx >= 0) mockEnterpriseProfiles[idx] = row;
    else mockEnterpriseProfiles.push(row);

    mockAuditLogs.unshift({
      id: `log_ep_${Date.now()}`,
      actorId: params.userId,
      action: "enterprise_verification_submitted",
      entityType: "enterprise_profile",
      entityId: params.userId,
      metadata: { organizationName, organizationWebsite, workEmail },
      createdAt: now,
    });
    return toEnterpriseProfileDto(row);
  }

  const prisma = await getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, enterpriseProfile: { select: { status: true } } },
  });
  if (!existing) throw new Error("USER_NOT_FOUND");
  if (existing.enterpriseProfile?.status === "approved") throw new Error("ENTERPRISE_ALREADY_APPROVED");

  const row = await prisma.user.update({
    where: { id: params.userId },
    data: {
      enterpriseProfile: {
        upsert: {
          create: {
            status: "pending",
            organization: organizationName,
            website: organizationWebsite,
            useCase: useCase ?? null,
            appliedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNote: null,
          },
          update: {
            status: "pending",
            organization: organizationName,
            website: organizationWebsite,
            useCase: useCase ?? null,
            appliedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNote: null,
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: params.userId,
      action: "enterprise_verification_submitted",
      entityType: "enterprise_profile",
      entityId: params.userId,
      metadata: { organizationName, organizationWebsite, workEmail },
    },
  });
  return toEnterpriseProfileFromUser(row);
}

export async function listEnterpriseProfiles(params: {
  status?: EnterpriseVerificationStatus | "all";
  page: number;
  limit: number;
}): Promise<Paginated<EnterpriseProfile>> {
  if (useMockData) {
    const filtered = mockEnterpriseProfiles.filter((p) => {
      if (!params.status || params.status === "all") return true;
      return p.status === params.status;
    });
    return paginateArray(filtered.map(toEnterpriseProfileDto), params.page, params.limit);
  }
  const prisma = await getPrisma();
  const where =
    !params.status || params.status === "all"
      ? { status: { not: "none" as const } }
      : { status: params.status as "none" | "pending" | "approved" | "rejected" };
  const [items, total] = await Promise.all([
    prisma.enterpriseProfile.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        userId: true,
        ...enterpriseProfileSelect,
        user: { select: { email: true } },
      },
    }),
    prisma.enterpriseProfile.count({ where }),
  ]);
  return {
    items: items.map((row) =>
      toEnterpriseProfileFromUser({
        id: row.userId,
        email: row.user.email,
        enterpriseProfile: {
          status: row.status,
          organization: row.organization,
          website: row.website,
          useCase: row.useCase,
          reviewedBy: row.reviewedBy,
          reviewNote: row.reviewNote,
          appliedAt: row.appliedAt,
          reviewedAt: row.reviewedAt,
        },
      })
    ),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function reviewEnterpriseVerification(params: {
  userId: string;
  adminUserId: string;
  action: "approve" | "reject";
  reviewNote?: string;
}): Promise<EnterpriseProfile> {
  const reviewNote = params.reviewNote?.trim() || undefined;
  const nextStatus: EnterpriseVerificationStatus = params.action === "approve" ? "approved" : "rejected";

  if (useMockData) {
    const idx = mockEnterpriseProfiles.findIndex((p) => p.userId === params.userId);
    if (idx < 0) throw new Error("ENTERPRISE_PROFILE_NOT_FOUND");
    const row = mockEnterpriseProfiles[idx];
    if (row.status !== "pending") throw new Error("ENTERPRISE_PROFILE_NOT_PENDING");
    const now = new Date().toISOString();
    row.status = nextStatus;
    row.reviewedBy = params.adminUserId;
    row.reviewNote = reviewNote;
    row.updatedAt = now;

    mockAuditLogs.unshift({
      id: `log_ep_review_${Date.now()}`,
      actorId: params.adminUserId,
      action: `enterprise_verification_${nextStatus}`,
      entityType: "enterprise_profile",
      entityId: params.userId,
      metadata: { reviewNote },
      createdAt: now,
    });
    return toEnterpriseProfileDto(row);
  }

  const prisma = await getPrisma();
  const profile = await prisma.enterpriseProfile.findUnique({
    where: { userId: params.userId },
    select: { userId: true, status: true },
  });
  if (!profile) throw new Error("ENTERPRISE_PROFILE_NOT_FOUND");
  if (profile.status !== "pending") throw new Error("ENTERPRISE_PROFILE_NOT_PENDING");

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const row = await tx.enterpriseProfile.update({
      where: { userId: params.userId },
      data: {
        status: nextStatus as "approved" | "rejected",
        reviewedAt: new Date(),
        reviewedBy: params.adminUserId,
        reviewNote: reviewNote ?? null,
      },
      select: {
        userId: true,
        ...enterpriseProfileSelect,
        user: { select: { email: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.adminUserId,
        action: `enterprise_verification_${nextStatus}`,
        entityType: "enterprise_profile",
        entityId: params.userId,
        metadata: { reviewNote },
      },
    });
    return row;
  });
  return toEnterpriseProfileFromUser({
    id: updated.userId,
    email: updated.user.email,
    enterpriseProfile: {
      status: updated.status,
      organization: updated.organization,
      website: updated.website,
      useCase: updated.useCase,
      reviewedBy: updated.reviewedBy,
      reviewNote: updated.reviewNote,
      appliedAt: updated.appliedAt,
      reviewedAt: updated.reviewedAt,
    },
  });
}
