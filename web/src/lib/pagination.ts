export interface PaginationInput {
  page: number;
  limit: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationInput {
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 10,
  };
}

export function paginateArray<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    items: items.slice(start, end),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
    },
  };
}
