import { apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { parsePagination } from "@/lib/pagination";
import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  if (isMockDataEnabled()) {
    return apiSuccess({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  }

  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);

  const [items, total] = await Promise.all([
    prisma.adminAiSuggestion.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAiSuggestion.count(),
  ]);

  return apiSuccess({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
