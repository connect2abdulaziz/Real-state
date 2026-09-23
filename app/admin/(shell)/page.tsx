import Link from "next/link";
import {
  fetchAdminAnalytics,
  fetchAdminLeads,
  fetchSubmissionSeries,
} from "@/lib/admin/queries";
import { Panel, PageHeader, formatWhen, EmptyState } from "@/components/admin/ui";
import { PipelineBadge } from "@/components/admin/Badges";
import {
  ACCENT,
  BarChart,
  DonutChart,
  FunnelSteps,
  HorizontalBars,
  SparkArea,
} from "@/components/admin/Charts";
import { formatCad } from "@/lib/report/types";
import { ArrowRight, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [analytics, recentResult, series] = await Promise.all([
    fetchAdminAnalytics(),
    fetchAdminLeads({ limit: 5 }),
    fetchSubmissionSeries(14),
  ]);
  const recent = recentResult.rows;
  const sparkPoints = series.map((d) => d.count);
  const weekTotal = sparkPoints.reduce((a, b) => a + b, 0);

  const conversion =
    analytics.conversationsTotal > 0
      ? Math.round(
          (analytics.valuationsCompleted / analytics.conversationsTotal) * 100
        )
      : 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Overview"
        description="Funnel health, delivery performance, and the latest homeowner activity."
        action={
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-soft/60 px-3.5 py-2 text-[12px] text-foreground-muted">
            <TrendingUp size={14} className="text-electric" />
            <span>
              <span className="text-foreground font-medium tabular-nums">
                {conversion}%
              </span>{" "}
              valuation rate
            </span>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-md border border-white/8 bg-gradient-to-b from-surface-soft/80 to-surface/40 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
            Submissions
          </p>
          <p className="mt-2 text-[1.85rem] font-semibold tabular-nums text-electric leading-none">
            {analytics.conversationsTotal}
          </p>
          <p className="mt-2 text-[12px] text-foreground-muted">
            {analytics.conversationsInProgress} in progress
          </p>
          <div className="mt-3">
            <SparkArea points={sparkPoints} color={ACCENT.electric} height={48} />
          </div>
          <p className="mt-1 text-[10px] text-foreground-subtle">
            {weekTotal} in last 14 days
          </p>
        </div>

        <div className="rounded-md border border-white/8 bg-gradient-to-b from-surface-soft/80 to-surface/40 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
            Valuations
          </p>
          <p className="mt-2 text-[1.85rem] font-semibold tabular-nums text-electric-soft leading-none">
            {analytics.valuationsCompleted}
          </p>
          <p className="mt-2 text-[12px] text-foreground-muted">
            {analytics.valuationsFailed} failed · {analytics.reportsGenerated} reports
          </p>
          <div className="mt-4">
            <HorizontalBars
              rows={[
                {
                  label: "Completed",
                  value: analytics.valuationsCompleted,
                  color: ACCENT.cyan,
                },
                {
                  label: "Failed",
                  value: analytics.valuationsFailed,
                  color: ACCENT.warm,
                },
                {
                  label: "Reports",
                  value: analytics.reportsGenerated,
                  color: ACCENT.ok,
                },
              ]}
            />
          </div>
        </div>

        <div className="rounded-md border border-white/8 bg-gradient-to-b from-surface-soft/80 to-surface/40 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
            Consultations
          </p>
          <p className="mt-2 text-[1.85rem] font-semibold tabular-nums text-warm leading-none">
            {analytics.consultationsRequested +
              analytics.consultationsScheduled +
              analytics.consultationsCompleted}
          </p>
          <p className="mt-2 text-[12px] text-foreground-muted">
            {analytics.consultationsRequested} waiting
          </p>
          <div className="mt-4">
            <HorizontalBars
              rows={[
                {
                  label: "Requested",
                  value: analytics.consultationsRequested,
                  color: ACCENT.warm,
                },
                {
                  label: "Scheduled",
                  value: analytics.consultationsScheduled,
                  color: ACCENT.cyan,
                },
                {
                  label: "Done",
                  value: analytics.consultationsCompleted,
                  color: ACCENT.ok,
                },
              ]}
            />
          </div>
        </div>

        <div className="rounded-md border border-white/8 bg-gradient-to-b from-surface-soft/80 to-surface/40 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
            Delivery
          </p>
          <p className="mt-2 text-[1.85rem] font-semibold tabular-nums text-emerald-300 leading-none">
            {analytics.fubSynced + analytics.emailsSent}
          </p>
          <p className="mt-2 text-[12px] text-foreground-muted">
            FUB + email successes
          </p>
          <div className="mt-4">
            <HorizontalBars
              rows={[
                {
                  label: "FUB ok",
                  value: analytics.fubSynced,
                  color: ACCENT.ok,
                },
                {
                  label: "Email ok",
                  value: analytics.emailsSent,
                  color: ACCENT.cyan,
                },
                {
                  label: "Failed",
                  value: analytics.fubFailed + analytics.emailsFailed,
                  color: ACCENT.warm,
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel
          title="Lead funnel"
          subtitle="From conversation start through consultation"
          bodyClassName="px-4 sm:px-5 py-5"
        >
          <FunnelSteps
            steps={[
              {
                label: "Submissions",
                value: analytics.conversationsTotal,
                hint: "started",
              },
              {
                label: "Completed chats",
                value: analytics.conversationsCompleted,
              },
              {
                label: "Valued",
                value: analytics.valuationsCompleted,
              },
              {
                label: "Consult requested",
                value: analytics.consultationsRequested,
              },
              {
                label: "Scheduled / done",
                value:
                  analytics.consultationsScheduled +
                  analytics.consultationsCompleted,
              },
            ]}
          />
        </Panel>

        <Panel
          title="Conversation mix"
          subtitle="Current status breakdown"
          bodyClassName="px-4 sm:px-5 py-5"
        >
          <DonutChart
            centerValue={analytics.conversationsTotal}
            centerLabel="total"
            segments={[
              {
                label: "Completed",
                value: analytics.conversationsCompleted,
                color: ACCENT.electric,
              },
              {
                label: "In progress",
                value: analytics.conversationsInProgress,
                color: ACCENT.cyan,
              },
              {
                label: "Abandoned",
                value: analytics.conversationsAbandoned,
                color: "rgba(255,255,255,0.2)",
              },
            ]}
          />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel
          title="Submissions · 14 days"
          subtitle="Daily conversation volume"
          bodyClassName="px-4 sm:px-5 py-5"
        >
          <BarChart
            height={180}
            bars={series.map((d) => ({
              label: d.label.replace(/^[A-Za-z]+ /, ""),
              value: d.count,
              color: ACCENT.cyan,
            }))}
          />
        </Panel>

        <Panel
          title="Integration health"
          subtitle="Follow Up Boss & Resend outcomes"
          bodyClassName="px-4 sm:px-5 py-5"
        >
          <DonutChart
            size={148}
            centerValue={
              analytics.fubSynced +
                analytics.emailsSent +
                analytics.fubFailed +
                analytics.emailsFailed
            }
            centerLabel="events"
            segments={[
              {
                label: "FUB success",
                value: analytics.fubSynced,
                color: ACCENT.ok,
              },
              {
                label: "Email success",
                value: analytics.emailsSent,
                color: ACCENT.cyan,
              },
              {
                label: "FUB failed",
                value: analytics.fubFailed,
                color: ACCENT.warm,
              },
              {
                label: "Email failed",
                value: analytics.emailsFailed,
                color: "#f87171",
              },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Latest leads"
        subtitle="Jump into a submission for full detail"
        action={
          <Link
            href="/admin/leads"
            className="text-[12px] text-electric hover:underline inline-flex items-center gap-1"
          >
            All leads <ArrowRight size={12} />
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState message="No leads yet — run a valuation or the smoke test." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/8 text-[11px] uppercase tracking-[0.08em] text-foreground-subtle">
                  <th className="px-4 sm:px-5 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Property
                  </th>
                  <th className="px-4 py-3 font-medium">Range</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 sm:px-5 py-3 font-medium hidden md:table-cell">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr
                    key={row.conversationId}
                    className="border-b border-white/5 hover:bg-white/[0.025] transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <Link
                        href={`/admin/leads/${row.conversationId}`}
                        className="text-foreground hover:text-electric font-medium"
                      >
                        {row.name || "Unknown"}
                      </Link>
                      <p className="text-[12px] text-foreground-subtle mt-0.5">
                        {row.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-foreground-muted hidden sm:table-cell max-w-[14rem] truncate">
                      {row.address || "—"}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-foreground-muted whitespace-nowrap">
                      {row.valueLow != null && row.valueHigh != null
                        ? `${formatCad(row.valueLow)} – ${formatCad(row.valueHigh)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <PipelineBadge status={row.pipeline} />
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-foreground-subtle hidden md:table-cell whitespace-nowrap">
                      {formatWhen(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
