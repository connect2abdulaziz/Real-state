import Link from "next/link";
import { fetchAdminLeads } from "@/lib/admin/queries";
import { Panel, PageHeader, formatWhen, EmptyState } from "@/components/admin/ui";
import { PipelineBadge, SoftBadge } from "@/components/admin/Badges";
import { formatCad } from "@/lib/report/types";
import { LeadsFilters } from "@/components/admin/LeadsFilters";
import { Pagination } from "@/components/admin/Pagination";
import { parsePage, DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; pipeline?: string; page?: string };
}) {
  const q = searchParams.q || "";
  const pipeline = searchParams.pipeline || "all";
  const page = parsePage(searchParams.page);
  const result = await fetchAdminLeads({
    q,
    pipeline,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Funnel"
        title="Leads"
        description="Homeowner submissions, valuations, and consultation status."
      />

      <LeadsFilters q={q} pipeline={pipeline} />

      <Panel
        title={`${result.total} lead${result.total === 1 ? "" : "s"}`}
        subtitle="10 per page — click a row for full detail"
      >
        {result.rows.length === 0 ? (
          <EmptyState message="No matches for this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/8 text-[11px] uppercase tracking-[0.08em] text-foreground-subtle">
                  <th className="px-4 sm:px-5 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Valuation</th>
                  <th className="px-4 py-3 font-medium">Pipeline</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">
                    FUB
                  </th>
                  <th className="px-4 sm:px-5 py-3 font-medium hidden md:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.conversationId}
                    className="border-b border-white/5 hover:bg-white/[0.025] transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3.5 align-top">
                      <Link
                        href={`/admin/leads/${row.conversationId}`}
                        className="font-medium text-foreground hover:text-electric"
                      >
                        {row.name || "Unknown"}
                      </Link>
                      <p className="text-[12px] text-foreground-subtle mt-0.5">
                        {row.email || "—"}
                      </p>
                      {row.phone && (
                        <p className="text-[12px] text-foreground-subtle">
                          {row.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top max-w-[16rem]">
                      <p className="text-foreground-muted truncate">
                        {row.address || "—"}
                      </p>
                      {row.propertyType && (
                        <p className="text-[12px] text-foreground-subtle mt-0.5">
                          {row.propertyType}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top whitespace-nowrap tabular-nums text-foreground-muted">
                      {row.valueLow != null && row.valueHigh != null ? (
                        <>
                          <p>
                            {formatCad(row.valueLow)} – {formatCad(row.valueHigh)}
                          </p>
                          {row.confidence && (
                            <p className="text-[11px] text-foreground-subtle mt-0.5 capitalize">
                              {row.confidence} confidence
                            </p>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <PipelineBadge status={row.pipeline} />
                    </td>
                    <td className="px-4 py-3.5 align-top hidden lg:table-cell">
                      {row.fubPersonId ? (
                        <SoftBadge tone="ok">Synced</SoftBadge>
                      ) : (
                        <SoftBadge tone="neutral">—</SoftBadge>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 align-top text-foreground-subtle whitespace-nowrap hidden md:table-cell">
                      {formatWhen(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={result.page}
          pages={result.pages}
          total={result.total}
          pageSize={result.pageSize}
          basePath="/admin/leads"
          searchParams={{
            q: q || undefined,
            pipeline: pipeline !== "all" ? pipeline : undefined,
          }}
        />
      </Panel>
    </div>
  );
}
