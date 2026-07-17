// BlogAI Pro — API Oficial v1: parsing de parâmetros de listagem.
// Conforme docs/api/ARCHITECTURE.md §8.3.

import type { Pagination } from "./envelope";

export interface ListParams {
  page: number;
  per_page: number;
  sort?: { field: string; direction: "asc" | "desc" };
  search?: string;
}

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export function parseListParams(url: URL, allowedSort: string[] = []): ListParams {
  const p = url.searchParams;

  const page = Math.max(1, Number(p.get("page") ?? "1") || 1);
  const perRaw = Number(p.get("per_page") ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE;
  const per_page = Math.min(MAX_PER_PAGE, Math.max(1, perRaw));

  let sort: ListParams["sort"] | undefined;
  const sortRaw = p.get("sort");
  if (sortRaw) {
    const direction: "asc" | "desc" = sortRaw.startsWith("-") ? "desc" : "asc";
    const field = sortRaw.replace(/^[-+]/, "");
    if (allowedSort.length === 0 || allowedSort.includes(field)) {
      sort = { field, direction };
    }
  }

  const search = p.get("search")?.trim() || undefined;
  return { page, per_page, sort, search };
}

export function buildPagination(
  params: ListParams,
  total: number,
): Pagination {
  const total_pages = Math.max(1, Math.ceil(total / params.per_page));
  return {
    page: params.page,
    per_page: params.per_page,
    total,
    total_pages,
    has_next: params.page < total_pages,
    has_prev: params.page > 1,
  };
}
