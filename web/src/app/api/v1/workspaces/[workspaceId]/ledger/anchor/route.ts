import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserTier } from "@/lib/repositories/billing.repository";
import { anchorWorkspaceLedger } from "@/lib/repositories/ledger.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

const bodySchema = z.object({
  provider: z.enum(["zhixin", "baoquan"]),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function POST(request: Request, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const tier = await getUserTier(session.userId);
  if (tier !== "pro") {
    return apiError({ code: "PAYMENT_REQUIRED", message: "账本司法锚定仅对 Pro 用户开放" }, 402);
  }

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError({ code: "INVALID_BODY", message: "Invalid anchor payload", details: parsed.error.flatten() }, 400);
    }
    const { workspaceId } = await params;
    const result = await anchorWorkspaceLedger({
      userId: session.userId,
      workspaceId,
      provider: parsed.data.provider,
      from: parseDate(parsed.data.from),
      to: parseDate(parsed.data.to),
    });
    return apiSuccess({ anchor: result });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to anchor ledger";
    if (message.includes("未配置")) {
      return apiError({ code: "ANCHOR_PROVIDER_NOT_CONFIGURED", message }, 503);
    }
    return apiError({ code: "LEDGER_ANCHOR_FAILED", message }, 500);
  }
}
