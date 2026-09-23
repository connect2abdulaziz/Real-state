import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  basePath,
  searchParams = {},
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  function hrefFor(p: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const windowPages = buildWindow(page, pages);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-white/8 bg-surface-soft/30">
      <p className="text-[12px] text-foreground-subtle tabular-nums">
        Showing <span className="text-foreground-muted">{start}–{end}</span> of{" "}
        <span className="text-foreground-muted">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={hrefFor(page - 1)} disabled={page <= 1} label="Prev">
          <ChevronLeft size={14} />
        </PageLink>
        {windowPages.map((p, i) =>
          p === "…" ? (
            <span
              key={`e-${i}`}
              className="px-2 text-[12px] text-foreground-subtle"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              className={`min-w-8 h-8 px-2 rounded-md text-[12px] tabular-nums inline-flex items-center justify-center transition-colors ${
                p === page
                  ? "bg-electric/20 text-electric border border-electric/30"
                  : "text-foreground-muted hover:bg-white/5 border border-transparent"
              }`}
            >
              {p}
            </Link>
          )
        )}
        <PageLink href={hrefFor(page + 1)} disabled={page >= pages} label="Next">
          <ChevronRight size={14} />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        className="min-w-8 h-8 inline-flex items-center justify-center rounded-md text-foreground-subtle/40"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="min-w-8 h-8 inline-flex items-center justify-center rounded-md text-foreground-muted hover:bg-white/5 hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  );
}

function buildWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pages - 1) items.push("…");
  items.push(pages);
  return items;
}
