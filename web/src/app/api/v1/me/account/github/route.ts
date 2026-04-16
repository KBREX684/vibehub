import { apiError, apiSuccess } from "@/lib/response";
import { authenticateRequest } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { unlinkGitHubAccount } from "@/lib/repository";
import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockUsers } from "@/lib/data/mock-data";

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  if (isMockDataEnabled()) {
    const u = mockUsers.find((x) => x.id === auth.user.userId);
    if (!u?.passwordHash) {
      return apiError(
        { code: "CANNOT_UNLINK", message: "Set an email password before unlinking GitHub" },
        400
      );
    }
    if (!u.githubId) {
      return apiError({ code: "NOT_LINKED", message: "GitHub is not linked" }, 400);
    }
    await unlinkGitHubAccount(auth.user.userId);
    return apiSuccess({ ok: true });
  }

  const row = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { passwordHash: true, githubId: true },
  });
  if (!row?.passwordHash) {
    return apiError(
      { code: "CANNOT_UNLINK", message: "Set an email password before unlinking GitHub" },
      400
    );
  }
  if (!row.githubId) {
    return apiError({ code: "NOT_LINKED", message: "GitHub is not linked" }, 400);
  }
  await unlinkGitHubAccount(auth.user.userId);
  return apiSuccess({ ok: true });
}
