import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import {
  getEnterpriseProfileByUserId,
  submitEnterpriseVerification,
  getLatestEnterpriseVerificationApplication,
} from "@/lib/repository";

const verificationSchema = z.object({
  organizationName: z.string().min(2).max(120),
  organizationWebsite: z.string().url().max(200),
  workEmail: z.string().email().max(200),
  useCase: z.string().max(2000).optional(),
});

function mapVerificationError(message: string) {
  switch (message) {
    case "INVALID_ORGANIZATION_NAME":
    case "INVALID_ORGANIZATION_WEBSITE":
    case "INVALID_WORK_EMAIL":
      return apiError(
        {
          code: message,
          message: "Invalid enterprise verification payload",
        },
        400
      );
    case "ENTERPRISE_ALREADY_APPROVED":
      return apiError(
        {
          code: "ENTERPRISE_ALREADY_APPROVED",
          message: "Enterprise access already approved",
        },
        409
      );
    default:
      return apiError(
        {
          code: "ENTERPRISE_VERIFICATION_FAILED",
          message: "Failed to process enterprise verification request",
          details: message,
        },
        500
      );
  }
}

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const [profile, application] = await Promise.all([
      getEnterpriseProfileByUserId(session.userId),
      getLatestEnterpriseVerificationApplication(session.userId),
    ]);
    return apiSuccess({
      profile,
      application,
      access: {
        role: session.role,
        enterpriseStatus: profile?.status ?? session.enterpriseStatus ?? "none",
      },
    });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const message = error instanceof Error ? error.message : String(error);
    return apiError(
      {
        code: "ENTERPRISE_VERIFICATION_FETCH_FAILED",
        message: "Failed to load enterprise verification status",
        details: message,
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const payload = verificationSchema.parse(await request.json());
    const profile = await submitEnterpriseVerification({
      userId: session.userId,
      organizationName: payload.organizationName,
      organizationWebsite: payload.organizationWebsite,
      workEmail: payload.workEmail,
      useCase: payload.useCase,
    });
    const application = await getLatestEnterpriseVerificationApplication(session.userId);
    return apiSuccess({ profile, application }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid enterprise verification payload",
          details: error.flatten(),
        },
        400
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return mapVerificationError(message);
  }
}