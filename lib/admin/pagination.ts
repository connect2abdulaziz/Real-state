export const DEFAULT_PAGE_SIZE = 10;

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function pageCount(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const pages = pageCount(total, pageSize);
  return Math.min(Math.max(1, page), pages);
}

export function slicePage<T>(
  rows: T[],
  page: number,
  pageSize: number
): { rows: T[]; total: number; page: number; pageSize: number; pages: number } {
  const total = rows.length;
  const safePage = clampPage(page, total, pageSize);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    pages: pageCount(total, pageSize),
  };
}

export function rangeForPage(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}
