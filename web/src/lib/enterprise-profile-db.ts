import type { EnterpriseVerificationStatus } from "@/lib/types";

/** Prisma `select` fragment for enterprise fields used in API responses and session. */
export const enterpriseProfileSelect = {
  status: true,
  organization: true,
  website: true,
  useCase: true,
  reviewedBy: true,
  reviewNote: true,
  appliedAt: true,
  reviewedAt: true,
} as const;

export type EnterpriseProfileRow = {
  status: EnterpriseVerificationStatus;
  organization: string | null;
  website: string | null;
  useCase: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  appliedAt: Date | null;
  reviewedAt: Date | null;
};

/** Maps `EnterpriseProfile` + user email to the public `EnterpriseProfile` DTO shape (repository). */
export function enterpriseRowForProfileDto(userId: string, email: string, p: EnterpriseProfileRow | null | undefined) {
  const status = (p?.status ?? "none") as EnterpriseVerificationStatus;
  return {
    id: userId,
    enterpriseStatus: status,
    enterpriseOrganization: p?.organization ?? null,
    enterpriseWebsite: p?.website ?? null,
    enterpriseUseCase: p?.useCase ?? null,
    enterpriseReviewedBy: p?.reviewedBy ?? null,
    enterpriseReviewNote: p?.reviewNote ?? null,
    enterpriseAppliedAt: p?.appliedAt ?? null,
    enterpriseReviewedAt: p?.reviewedAt ?? null,
    email,
  };
}

export function sessionEnterpriseFromProfile(
  p: EnterpriseProfileRow | null | undefined
): {
  enterpriseStatus: EnterpriseVerificationStatus;
  enterpriseOrganization?: string;
  enterpriseWebsite?: string;
} {
  return {
    enterpriseStatus: (p?.status ?? "none") as EnterpriseVerificationStatus,
    enterpriseOrganization: p?.organization ?? undefined,
    enterpriseWebsite: p?.website ?? undefined,
  };
}
