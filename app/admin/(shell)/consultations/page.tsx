import Link from "next/link";
import { fetchAdminConsultations } from "@/lib/admin/queries";
import { Panel, PageHeader, formatWhen, EmptyState } from "@/components/admin/ui";
import { SoftBadge } from "@/components/admin/Badges";
import { ConsultationStatusSelect } from "@/components/admin/ConsultationStatusSelect";
import { formatCad } from "@/lib/report/types";
import { ConsultationsFilters } from "@/components/admin/ConsultationsFilters";
import { Pagination } from "@/components/admin/Pagination";
import { parsePage, DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

export const dynamic = "force-dynamic";

export default async function AdminConsultationsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const status = searchParams.status || "requested";
  const page = parsePage(searchParams.page);
  const result = await fetchAdminConsultations({
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title="Consultations"
        description="Appointment requests — update status as you book."
      />

      <ConsultationsFilters status={status} />

      <Panel
        title={`${result.total} consultation${result.total === 1 ? "" : "s"}`}
        subtitle="10 per page"
      >
        {result.rows.length === 0 ? (
          <EmptyState message="No consultations in this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/8 text-[11px] uppercase tracking-[0.08em] text-foreground-subtle">
                  <th className="px-4 sm:px-5 py-3 font-medium">Homeowner</th>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Channel / time</th>
                  <th className="px-4 py-3 font-medium">Range</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 sm:px-5 py-3 font-medium hidden md:table-cell">
                    Requested
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row: Record<string, unknown>) => {
                  const id = row.id as string;
                  const conversationId = row.conversation_id as string;
                  const homeowners = row.homeowners as {
                    name?: string;
                    email?: string;
                  } | null;
                  const properties = row.properties as {
                    address?: string;
                  } | null;
                  const valuations = row.valuations as {
                    estimated_value_low?: number;
                    estimated_value_high?: number;
                  } | null;
                  const channel = row.channel as string | null;
                  const preferred = row.preferred_time as string | null;
                  const consultStatus = row.status as
                    | "requested"
                    | "declined"
                    | "scheduled"
                    | "completed";

                  return (
                    <tr
                      key={id}
                      className="border-b border-white/5 hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-3.5 align-top">
                        <Link
                          href={`/admin/leads/${conversationId}`}
                          className="font-medium text-foreground hover:text-electric"
                        >
                          {homeowners?.name || "Unknown"}
                        </Link>
                        <p className="text-[12px] text-foreground-subtle mt-0.5">
                          {homeowners?.email || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top text-foreground-muted max-w-[14rem] truncate">
                        {properties?.address || "—"}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <SoftBadge tone="info">{channel || "—"}</SoftBadge>
                        <p className="text-[12px] text-foreground-muted mt-1.5">
                          {preferred || "No preferred time"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top tabular-nums text-foreground-muted whitespace-nowrap">
                        {valuations?.estimated_value_low != null
                          ? `${formatCad(valuations.estimated_value_low)} – ${formatCad(valuations.estimated_value_high)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <ConsultationStatusSelect
                          id={id}
                          status={consultStatus}
                        />
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 align-top text-foreground-subtle whitespace-nowrap hidden md:table-cell">
                        {formatWhen(row.created_at as string)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={result.page}
          pages={result.pages}
          total={result.total}
          pageSize={result.pageSize}
          basePath="/admin/consultations"
          searchParams={{
            status: status !== "requested" ? status : undefined,
          }}
        />
      </Panel>
    </div>
  );
}
