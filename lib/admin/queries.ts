import { createAdminClient } from "@/lib/supabase/admin";
import { derivePipeline } from "./pipeline";
import type {
  AdminAnalytics,
  AdminIntegrationEvent,
  AdminLeadRow,
} from "./types";
import type {
  Answers,
  ConsultationRecord,
  ConsultationStatus,
  ConversationRecord,
  PropertyRecord,
  TranscriptMessage,
  ValuationRecord,
} from "@/lib/types";

type HomeownerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  fub_person_id: string | null;
  fub_synced_at: string | null;
  created_at: string;
};

type ConversationJoin = ConversationRecord & {
  homeowners: HomeownerRow | HomeownerRow[] | null;
  properties: PropertyRecord | PropertyRecord[] | null;
  valuations: ValuationRecord | ValuationRecord[] | null;
  consultations: ConsultationRecord | ConsultationRecord[] | null;
};

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function latestByCreated<T extends { created_at: string }>(
  v: T | T[] | null | undefined
): T | null {
  if (v == null) return null;
  const list = Array.isArray(v) ? v : [v];
  if (list.length === 0) return null;
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}

function toLeadRow(c: ConversationJoin): AdminLeadRow {
  const homeowner = one(c.homeowners);
  const property = one(c.properties);
  const valuation = latestByCreated(c.valuations);
  const consultation = latestByCreated(c.consultations);
  const answers = (c.answers || {}) as Answers;

  return {
    conversationId: c.id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    conversationStatus: c.status,
    homeownerId: homeowner?.id ?? c.homeowner_id,
    name: homeowner?.name ?? answers.homeownerName ?? null,
    email: homeowner?.email ?? answers.homeownerEmail ?? null,
    phone: homeowner?.phone ?? answers.homeownerPhone ?? null,
    fubPersonId: homeowner?.fub_person_id ?? null,
    fubSyncedAt: homeowner?.fub_synced_at ?? null,
    propertyId: property?.id ?? null,
    address: property?.address ?? answers.streetAddress ?? null,
    propertyType: property?.property_type ?? answers.propertyType ?? null,
    valuationId: valuation?.id ?? null,
    valuationStatus: valuation?.status ?? null,
    valueLow: valuation?.estimated_value_low ?? null,
    valueHigh: valuation?.estimated_value_high ?? null,
    confidence: valuation?.confidence ?? null,
    reportGeneratedAt: valuation?.report_generated_at ?? null,
    consultationId: consultation?.id ?? null,
    consultationStatus: consultation?.status ?? null,
    wantsReview: consultation?.wants_review ?? null,
    channel: consultation?.channel ?? null,
    preferredTime: consultation?.preferred_time ?? null,
    motivation: answers.motivation ?? null,
    pipeline: derivePipeline({
      conversationStatus: c.status,
      valuationStatus: valuation?.status ?? null,
      consultationStatus: consultation?.status ?? null,
    }),
  };
}

const LEAD_SELECT = `
  id, homeowner_id, status, transcript, answers, created_at, updated_at,
  homeowners ( id, name, email, phone, fub_person_id, fub_synced_at, created_at ),
  properties ( * ),
  valuations ( * ),
  consultations ( * )
`;

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  const supabase = createAdminClient();

  const [
    convAll,
    convCompleted,
    convInProgress,
    convAbandoned,
    valCompleted,
    valFailed,
    reports,
    consultRequested,
    consultDeclined,
    consultScheduled,
    consultCompleted,
    fubOk,
    fubFail,
    emailOk,
    emailFail,
  ] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("status", "abandoned"),
    supabase
      .from("valuations")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("valuations")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("valuations")
      .select("id", { count: "exact", head: true })
      .not("report_generated_at", "is", null),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("status", "declined"),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("integration_events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "fub_sync")
      .eq("status", "success"),
    supabase
      .from("integration_events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "fub_sync")
      .eq("status", "failed"),
    supabase
      .from("integration_events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "email")
      .eq("status", "success"),
    supabase
      .from("integration_events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "email")
      .eq("status", "failed"),
  ]);

  return {
    conversationsTotal: convAll.count ?? 0,
    conversationsCompleted: convCompleted.count ?? 0,
    conversationsInProgress: convInProgress.count ?? 0,
    conversationsAbandoned: convAbandoned.count ?? 0,
    valuationsCompleted: valCompleted.count ?? 0,
    valuationsFailed: valFailed.count ?? 0,
    reportsGenerated: reports.count ?? 0,
    consultationsRequested: consultRequested.count ?? 0,
    consultationsDeclined: consultDeclined.count ?? 0,
    consultationsScheduled: consultScheduled.count ?? 0,
    consultationsCompleted: consultCompleted.count ?? 0,
    fubSynced: fubOk.count ?? 0,
    fubFailed: fubFail.count ?? 0,
    emailsSent: emailOk.count ?? 0,
    emailsFailed: emailFail.count ?? 0,
  };
}

export async function fetchAdminLeads(opts?: {
  q?: string;
  pipeline?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: AdminLeadRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}> {
  const supabase = createAdminClient();
  const pageSize = opts?.pageSize ?? 10;
  const { data, error } = await supabase
    .from("conversations")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 500);

  if (error) throw new Error(error.message);

  let rows = ((data || []) as unknown as ConversationJoin[]).map(toLeadRow);

  if (opts?.pipeline && opts.pipeline !== "all") {
    rows = rows.filter((r) => r.pipeline === opts.pipeline);
  }

  if (opts?.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    rows = rows.filter((r) => {
      const hay = [r.name, r.email, r.phone, r.address, r.motivation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  // Legacy callers that only want a slice without pagination meta
  if (opts?.page == null && opts?.limit != null && opts.pageSize == null) {
    return {
      rows: rows.slice(0, opts.limit),
      total: rows.length,
      page: 1,
      pageSize: opts.limit,
      pages: 1,
    };
  }

  const { slicePage } = await import("./pagination");
  return slicePage(rows, opts?.page ?? 1, pageSize);
}

export async function fetchAdminLeadDetail(conversationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(LEAD_SELECT)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const c = data as unknown as ConversationJoin;
  const lead = toLeadRow(c);
  const homeowner = one(c.homeowners);
  const property = one(c.properties);
  const valuations = Array.isArray(c.valuations)
    ? c.valuations
    : c.valuations
      ? [c.valuations]
      : [];
  const consultations = Array.isArray(c.consultations)
    ? c.consultations
    : c.consultations
      ? [c.consultations]
      : [];

  const { data: events } = await supabase
    .from("integration_events")
    .select(
      "id, kind, trigger, status, provider, external_id, error_message, payload, created_at, conversation_id, homeowner_id"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  return {
    lead,
    homeowner,
    property,
    answers: (c.answers || {}) as Answers,
    transcript: (c.transcript || []) as TranscriptMessage[],
    valuations: valuations.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    consultations: consultations.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    events: (events || []) as AdminIntegrationEvent[],
  };
}

export async function fetchAdminConsultations(opts?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createAdminClient();
  const pageSize = opts?.pageSize ?? 10;
  const page = opts?.page ?? 1;
  const { from, to } = (await import("./pagination")).rangeForPage(page, pageSize);

  let query = supabase
    .from("consultations")
    .select(
      `
      *,
      homeowners ( id, name, email, phone ),
      properties ( id, address ),
      valuations ( id, estimated_value_low, estimated_value_high, status )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts?.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const { pageCount, clampPage } = await import("./pagination");
  const safePage = clampPage(page, total, pageSize);
  return {
    rows: data || [],
    total,
    page: safePage,
    pageSize,
    pages: pageCount(total, pageSize),
  };
}

export async function fetchAdminIntegrationEvents(opts?: {
  page?: number;
  pageSize?: number;
}) {
  const supabase = createAdminClient();
  const pageSize = opts?.pageSize ?? 10;
  const page = opts?.page ?? 1;
  const { from, to } = (await import("./pagination")).rangeForPage(page, pageSize);

  const { data, error, count } = await supabase
    .from("integration_events")
    .select(
      "id, kind, trigger, status, provider, external_id, error_message, payload, created_at, conversation_id, homeowner_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const { pageCount, clampPage } = await import("./pagination");
  const safePage = clampPage(page, total, pageSize);
  return {
    rows: (data || []) as AdminIntegrationEvent[],
    total,
    page: safePage,
    pageSize,
    pages: pageCount(total, pageSize),
  };
}

/** Daily submission counts for the last N days (chart series). */
export async function fetchSubmissionSeries(days = 14): Promise<
  { date: string; label: string; count: number }[]
> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("conversations")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const row of data || []) {
    const key = String(row.created_at).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: new Date(date + "T12:00:00").toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    }),
    count,
  }));
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("consultations")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ConsultationRecord;
}

