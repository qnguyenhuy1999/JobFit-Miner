export type JobListParams = {
  page: number;
  pageSize: number;
  query: string;
  site: string;
  location: string;
  minScore: number | null;
};

export function normalizeJobListParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): JobListParams {
  const read = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? "";
    }

    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };

  const page = Number.parseInt(read("page"), 10);
  const pageSize = Number.parseInt(read("pageSize"), 10);
  const minScore = Number.parseInt(read("minScore"), 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(pageSize, 50)
        : 10,
    query: read("query").trim(),
    site: read("site").trim(),
    location: read("location").trim(),
    minScore: Number.isFinite(minScore) ? minScore : null,
  };
}

export function buildJobListWhere(params: JobListParams) {
  const where: Record<string, unknown> = {};

  if (params.site) {
    where.site = params.site;
  }

  if (params.location) {
    where.location = { contains: params.location };
  }

  if (params.minScore !== null) {
    where.score = { gte: params.minScore };
  }

  if (params.query) {
    where.OR = [
      { title: { contains: params.query } },
      { company: { contains: params.query } },
      { location: { contains: params.query } },
    ];
  }

  return where;
}

export function buildPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    pageCount,
    hasPreviousPage: page > 1,
    hasNextPage: page < pageCount,
  };
}
