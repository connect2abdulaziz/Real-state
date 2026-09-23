import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAdminLeadDetail } from "@/lib/admin/queries";
import { Panel, formatWhen } from "@/components/admin/ui";
import { PipelineBadge, SoftBadge } from "@/components/admin/Badges";
import { ConsultationStatusSelect } from "@/components/admin/ConsultationStatusSelect";
import { RegenerateValuationButton } from "@/components/admin/RegenerateValuationButton";
import { formatCad } from "@/lib/report/types";
import { ArrowLeft, FileDown, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await fetchAdminLeadDetail(params.id);
  if (!detail) notFound();

  const { lead, property, valuations, consultations, events, transcript, answers } =
    detail;
  const valuation = valuations[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 text-[12px] text-foreground-muted hover:text-electric"
        >
          <ArrowLeft size={13} /> Back to leads
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-[clamp(1.5rem,3vw,2rem)] text-foreground">
              {lead.name || "Unknown lead"}
            </h1>
            <p className="mt-1 text-[14px] text-foreground-muted">
              {lead.email || "No email"}
              {lead.phone ? ` · ${lead.phone}` : ""}
            </p>
          </div>
          <PipelineBadge status={lead.pipeline} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Contact">
          <dl className="px-4 sm:px-5 py-4 space-y-3 text-[13px]">
            <Row label="Name" value={lead.name} />
            <Row label="Email" value={lead.email} />
            <Row label="Phone" value={lead.phone} />
            <Row label="Motivation" value={lead.motivation} />
            <Row
              label="FUB person"
              value={
                lead.fubPersonId ? (
                  <span className="inline-flex items-center gap-2">
                    <SoftBadge tone="ok">{lead.fubPersonId}</SoftBadge>
                    {lead.fubSyncedAt && (
                      <span className="text-foreground-subtle text-[11px]">
                        {formatWhen(lead.fubSyncedAt)}
                      </span>
                    )}
                  </span>
                ) : (
                  "Not synced"
                )
              }
            />
          </dl>
        </Panel>

        <Panel title="Property">
          <dl className="px-4 sm:px-5 py-4 space-y-3 text-[13px]">
            <Row label="Address" value={property?.address || lead.address} />
            <Row label="Type" value={property?.property_type} />
            <Row
              label="Beds / baths"
              value={
                property
                  ? `${property.bedrooms ?? "—"} / ${property.bathrooms ?? "—"}`
                  : null
              }
            />
            <Row
              label="Living area"
              value={
                property?.living_area_sqft
                  ? `${property.living_area_sqft} sq ft`
                  : null
              }
            />
            <Row label="Year built" value={property?.year_built?.toString()} />
            <Row label="Condition" value={property?.condition} />
            <Row label="Ownership" value={property?.ownership} />
          </dl>
        </Panel>

        <Panel title="Submission">
          <dl className="px-4 sm:px-5 py-4 space-y-3 text-[13px]">
            <Row label="Conversation" value={lead.conversationStatus} />
            <Row label="Created" value={formatWhen(lead.createdAt)} />
            <Row label="Updated" value={formatWhen(lead.updatedAt)} />
            <Row
              label="Conversation ID"
              value={
                <span className="font-mono text-[11px] text-foreground-subtle break-all">
                  {lead.conversationId}
                </span>
              }
            />
          </dl>
        </Panel>
      </div>

      <Panel
        title="Valuation"
        subtitle={
          valuation
            ? `${valuation.status} · ${valuation.confidence || "—"} confidence · model ${valuation.model || "—"}`
            : property
              ? "No valuation yet — you can generate one"
              : "No valuation yet"
        }
        action={
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {valuation?.status === "completed" && (
              <a
                href={`/api/reports/${valuation.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-electric hover:underline"
              >
                <FileDown size={13} /> PDF report
              </a>
            )}
            {property?.id && (
              <RegenerateValuationButton propertyId={property.id} />
            )}
          </div>
        }
      >
        {!valuation ? (
          <p className="px-5 py-8 text-[13px] text-foreground-muted">
            No valuation record for this conversation.
          </p>
        ) : (
          <div className="px-4 sm:px-5 py-5 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
                Estimated range
              </p>
              <p className="mt-1 font-serif text-[1.75rem] text-electric tabular-nums">
                {formatCad(valuation.estimated_value_low)} –{" "}
                {formatCad(valuation.estimated_value_high)}
              </p>
              {valuation.report_generated_at && (
                <p className="mt-1 text-[12px] text-foreground-subtle">
                  Report generated {formatWhen(valuation.report_generated_at)}
                </p>
              )}
              {valuation.error_message && (
                <p className="mt-2 text-[13px] text-warm">{valuation.error_message}</p>
              )}
            </div>

            {valuation.explanation && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle mb-1.5">
                  Explanation
                </p>
                <p className="text-[13px] text-foreground-muted leading-relaxed whitespace-pre-wrap">
                  {valuation.explanation}
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <FactorList
                title="Increasing value"
                items={valuation.factors_increasing_value}
              />
              <FactorList
                title="Decreasing value"
                items={valuation.factors_decreasing_value}
              />
            </div>

            {valuation.limitations && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle mb-1.5">
                  Limitations
                </p>
                <p className="text-[13px] text-foreground-muted leading-relaxed">
                  {valuation.limitations}
                </p>
              </div>
            )}
          </div>
        )}
      </Panel>

      {consultations.length > 0 && (
        <Panel title="Consultations" subtitle="Update status as appointments progress">
          <div className="divide-y divide-white/5">
            {consultations.map((c) => (
              <div
                key={c.id}
                className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="text-[13px]">
                  <p className="text-foreground font-medium capitalize">
                    {c.wants_review ? "Wants review" : "Declined review"} ·{" "}
                    {c.channel || "—"}
                  </p>
                  <p className="text-foreground-muted mt-0.5">
                    Preferred: {c.preferred_time || "—"}
                  </p>
                  <p className="text-[11px] text-foreground-subtle mt-1">
                    {formatWhen(c.created_at)}
                  </p>
                </div>
                <ConsultationStatusSelect id={c.id} status={c.status} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Integration timeline"
        subtitle="What was sent to Follow Up Boss, email, and SMS"
      >
        {events.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-foreground-muted">
            No integration events logged.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((e) => (
              <div key={e.id} className="px-4 sm:px-5 py-3.5 flex flex-wrap gap-3 items-start">
                <div className="min-w-[7rem]">
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
                    {e.trigger}
                    {e.provider ? ` · ${e.provider}` : ""}
                    {e.external_id ? ` · ${e.external_id}` : ""}
                  </p>
                  {e.error_message && (
                    <p className="text-warm text-[12px] mt-0.5">{e.error_message}</p>
                  )}
                </div>
                <p className="text-[11px] text-foreground-subtle whitespace-nowrap">
                  {formatWhen(e.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Answers">
          <div className="px-4 sm:px-5 py-4 max-h-80 overflow-y-auto">
            {Object.keys(answers).length === 0 ? (
              <p className="text-[13px] text-foreground-muted">No answers stored.</p>
            ) : (
              <dl className="space-y-2.5 text-[13px]">
                {Object.entries(answers).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
                    <dt className="text-foreground-subtle font-mono text-[11px] truncate">
                      {k}
                    </dt>
                    <dd className="text-foreground-muted break-words">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </Panel>

        <Panel title="Transcript">
          <div className="px-4 sm:px-5 py-4 max-h-80 overflow-y-auto space-y-3">
            {transcript.length === 0 ? (
              <p className="text-[13px] text-foreground-muted">Empty transcript.</p>
            ) : (
              transcript.map((m, i) => (
                <div key={i} className="text-[13px]">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-foreground-subtle mb-0.5">
                    {m.from}
                  </p>
                  <p className="text-foreground-muted leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {property?.notable_features || property?.renovations || property?.additional_notes ? (
        <Panel title="Property notes">
          <dl className="px-4 sm:px-5 py-4 space-y-3 text-[13px]">
            <Row label="Renovations" value={property?.renovations} />
            <Row label="Features" value={property?.notable_features} />
            <Row label="Notes" value={property?.additional_notes} />
            <Row label="Basement" value={property?.basement_info} />
            <Row label="Parking" value={property?.parking_info} />
          </dl>
        </Panel>
      ) : null}

      <p className="text-[12px] text-foreground-subtle flex items-center gap-1">
        <ExternalLink size={12} />
        Open homeowner valuation flow:{" "}
        <Link href="/valuation" className="text-electric hover:underline">
          /valuation
        </Link>
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-foreground-subtle">{label}</dt>
      <dd className="text-foreground-muted break-words">{value || "—"}</dd>
    </div>
  );
}

function FactorList({
  title,
  items,
}: {
  title: string;
  items: { factor: string; explanation: string }[] | null | undefined;
}) {
  const list = items || [];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle mb-2">
        {title}
      </p>
      {list.length === 0 ? (
        <p className="text-[13px] text-foreground-subtle">—</p>
      ) : (
        <ul className="space-y-2">
          {list.map((f, i) => (
            <li key={i} className="text-[13px]">
              <span className="text-foreground font-medium">{f.factor}</span>
              <span className="text-foreground-muted"> — {f.explanation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
