import Link from "next/link";
import { fetchAdminIntegrationEvents } from "@/lib/admin/queries";
import { Panel, PageHeader, formatWhen, EmptyState } from "@/components/admin/ui";
import { SoftBadge } from "@/components/admin/Badges";
import { Pagination } from "@/components/admin/Pagination";
import { parsePage, DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parsePage(searchParams.page);
  const result = await fetchAdminIntegrationEvents({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Integrations"
        description="Audit log of Follow Up Boss syncs, emails, and SMS."
      />

      <Panel
        title="Events"
        subtitle={`${result.total} total · 10 per page`}
      >
        {result.rows.length === 0 ? (
          <EmptyState message="No integration events yet." />
        ) : (
          <div className="divide-y divide-white/5">
            {result.rows.map((e) => (
              <div
                key={e.id}
                className="px-4 sm:px-5 py-3.5 flex flex-wrap gap-3 items-start hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-[8rem]">
                  <SoftBadge
                    tone={
                      e.status === "success"
                        ? "ok"
                        : e.status === "failed"
                          ? "bad"
                          : e.status === "skipped"
                            ? "warn"
                            : "neutral"
                    }
                  >
                    {e.kind}:{e.status}
                  </SoftBadge>
                </div>
                <div className="flex-1 min-w-0 text-[13px]">
                  <p className="text-foreground-muted">
                    <span className="text-foreground">{e.trigger}</span>
                    {e.provider ? ` · ${e.provider}` : ""}
                    {e.external_id ? (
                      <span className="font-mono text-[11px] text-foreground-subtle">
                        {" "}
                        · {e.external_id}
                      </span>
                    ) : null}
                  </p>
                  {e.error_message && (
                    <p className="text-warm text-[12px] mt-0.5">
                      {e.error_message}
                    </p>
                  )}
                  {e.conversation_id && (
                    <Link
                      href={`/admin/leads/${e.conversation_id}`}
                      className="text-[12px] text-electric hover:underline mt-1 inline-block"
                    >
                      View lead
                    </Link>
                  )}
                </div>
                <p className="text-[11px] text-foreground-subtle whitespace-nowrap">
                  {formatWhen(e.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
        <Pagination
          page={result.page}
          pages={result.pages}
          total={result.total}
          pageSize={result.pageSize}
          basePath="/admin/integrations"
        />
      </Panel>
    </div>
  );
}
