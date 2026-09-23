import { createAdminClient } from "@/lib/supabase/admin";
import { Answers, PropertyRecord, ValuationRecord } from "@/lib/types";
import { formatCad } from "@/lib/report/types";
import {
  FubEventPayload,
  isFubConfigured,
  postFubEvent,
  updateFubPerson,
} from "@/lib/integrations/fub/client";
import { logIntegrationEvent } from "@/lib/integrations/log";

const LEAD_SOURCE = "EstateValora – AI Property Valuation";

export function splitName(full: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Homeowner", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function buildMessage(args: {
  answers: Answers;
  property: PropertyRecord;
  valuation: ValuationRecord | null;
  consultation?: {
    wants_review: boolean;
    channel: string | null;
    preferred_time: string | null;
    status: string;
  } | null;
}): string {
  const { answers, property, valuation, consultation } = args;
  const lines = [
    "Estate Valora — AI property valuation lead",
    "",
    `Address: ${property.address || "—"}`,
    `Type: ${property.property_type || "—"}`,
    `Beds / baths: ${property.bedrooms ?? "—"} / ${property.bathrooms ?? "—"}`,
    `Living area: ${
      property.living_area_sqft != null
        ? `${property.living_area_sqft} sq ft`
        : "—"
    }`,
    `Lot: ${property.lot_size || "—"}`,
    `Year built: ${property.year_built ?? "—"}`,
    `Parking: ${property.parking_info || "—"}`,
    `Condition: ${property.condition || "—"}`,
    `Renovations: ${property.renovations || "—"}`,
    `Ownership: ${property.ownership || answers.ownership || "—"}`,
    `Motivation: ${answers.motivation || "—"}`,
    `Selling timeline: ${answers.sellingTimeline || "—"}`,
    `Expected value (owner): ${answers.expectedValue || "—"}`,
  ];

  if (valuation && valuation.status === "completed") {
    lines.push(
      "",
      `AI valuation range: ${formatCad(valuation.estimated_value_low)} – ${formatCad(
        valuation.estimated_value_high
      )}`,
      `Confidence: ${valuation.confidence}`,
      `Valuation status: completed`
    );
  } else if (valuation) {
    lines.push("", `Valuation status: ${valuation.status}`);
  } else {
    lines.push("", "Valuation status: pending / unavailable");
  }

  if (consultation) {
    lines.push(
      "",
      `Consultation: ${consultation.status}`,
      `Wants Ashkan review: ${consultation.wants_review ? "Yes" : "No"}`,
      `Channel: ${consultation.channel || "—"}`,
      `Preferred time: ${consultation.preferred_time || "—"}`
    );
  }

  return lines.join("\n");
}

function buildTags(answers: Answers, wantsReview?: boolean): string[] {
  const tags = ["EstateValora", "AI Valuation"];
  if (answers.motivation) tags.push(`Motivation: ${answers.motivation}`);
  if (answers.sellingTimeline) tags.push(`Timeline: ${answers.sellingTimeline}`);
  if (wantsReview) tags.push("Consultation Requested");
  if (answers.ownership) tags.push(`Ownership: ${answers.ownership}`);
  return tags.slice(0, 12);
}

/**
 * Create or update the FUB lead after valuation completes.
 */
export async function syncValuationLeadToFub(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string;
  valuation: ValuationRecord | null;
  answers: Answers;
}): Promise<void> {
  const supabase = createAdminClient();

  if (!isFubConfigured()) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "valuation_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuation?.id ?? null,
      status: "skipped",
      provider: "followupboss",
      errorMessage: "FOLLOW_UP_BOSS_API_KEY not configured",
    });
    return;
  }

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", args.propertyId)
    .single();

  if (!property) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "valuation_completed",
      conversationId: args.conversationId,
      status: "failed",
      provider: "followupboss",
      errorMessage: "Property not found for FUB sync",
    });
    return;
  }

  let homeowner: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    fub_person_id: string | null;
  } | null = null;

  if (args.homeownerId) {
    const { data } = await supabase
      .from("homeowners")
      .select("id, name, email, phone, fub_person_id")
      .eq("id", args.homeownerId)
      .single();
    homeowner = data;
  }

  const { firstName, lastName } = splitName(
    homeowner?.name || args.answers.homeownerName
  );
  const email = homeowner?.email || args.answers.homeownerEmail || null;
  const phone = homeowner?.phone || args.answers.homeownerPhone || null;

  const typedProperty = property as PropertyRecord;
  const message = buildMessage({
    answers: args.answers,
    property: typedProperty,
    valuation: args.valuation,
  });

  const person: FubEventPayload["person"] = {
    firstName,
    lastName: lastName || undefined,
    tags: buildTags(args.answers),
    source: LEAD_SOURCE,
  };
  if (email) person.emails = [{ value: email }];
  if (phone) person.phones = [{ value: phone }];
  if (typedProperty.address) {
    person.addresses = [
      {
        type: "home",
        street: String(typedProperty.details?.streetAddress || typedProperty.address),
        city: String(typedProperty.details?.city || ""),
        code: String(typedProperty.details?.postalCode || ""),
        country: "Canada",
      },
    ];
  }

  // Optional custom fields — only sent if you create matching fields in FUB.
  if (args.valuation?.status === "completed") {
    person.customValuationLow = Number(args.valuation.estimated_value_low);
    person.customValuationHigh = Number(args.valuation.estimated_value_high);
    person.customValuationConfidence = args.valuation.confidence;
  }
  if (args.answers.motivation) person.customMotivation = args.answers.motivation;
  if (args.answers.sellingTimeline) {
    person.customSellingTimeline = args.answers.sellingTimeline;
  }
  person.customReportStatus =
    args.valuation?.status === "completed" ? "ready" : "pending";

  const payload: FubEventPayload = {
    source: LEAD_SOURCE,
    system: "EstateValora",
    type: "Property Inquiry",
    message,
    person,
    property: {
      street: String(typedProperty.details?.streetAddress || typedProperty.address || ""),
      city: String(typedProperty.details?.city || ""),
      code: String(typedProperty.details?.postalCode || ""),
      type: typedProperty.property_type || undefined,
      bedrooms: typedProperty.bedrooms ?? undefined,
      bathrooms: typedProperty.bathrooms != null ? Number(typedProperty.bathrooms) : undefined,
      price:
        args.valuation?.status === "completed"
          ? Number(args.valuation.estimated_value_high)
          : undefined,
    },
  };

  try {
    const result = await postFubEvent(payload);
    if (!result.ok) {
      await logIntegrationEvent({
        kind: "fub_sync",
        trigger: "valuation_completed",
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        propertyId: args.propertyId,
        valuationId: args.valuation?.id ?? null,
        status: "failed",
        provider: "followupboss",
        payload: { request: payload, response: result.raw },
        errorMessage: result.error,
      });
      return;
    }

    const personId = result.personId != null ? String(result.personId) : null;
    if (homeowner?.id && personId) {
      await supabase
        .from("homeowners")
        .update({
          fub_person_id: personId,
          fub_synced_at: new Date().toISOString(),
        })
        .eq("id", homeowner.id);
    }

    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "valuation_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuation?.id ?? null,
      status: "success",
      provider: "followupboss",
      externalId: personId,
      payload: { response: result.raw },
    });
  } catch (err) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "valuation_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuation?.id ?? null,
      status: "failed",
      provider: "followupboss",
      errorMessage: err instanceof Error ? err.message : "FUB sync failed",
    });
  }
}

/**
 * Push consultation outcome to FUB (new event + optional person update).
 */
export async function syncConsultationToFub(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string | null;
  valuationId: string | null;
  consultationId: string;
  wantsReview: boolean;
  channel: string | null;
  preferredTime: string | null;
  status: string;
}): Promise<void> {
  if (!isFubConfigured()) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: args.wantsReview
        ? "consultation_requested"
        : "consultation_declined",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      consultationId: args.consultationId,
      status: "skipped",
      provider: "followupboss",
      errorMessage: "FOLLOW_UP_BOSS_API_KEY not configured",
    });
    return;
  }

  const supabase = createAdminClient();
  const trigger = args.wantsReview
    ? "consultation_requested"
    : "consultation_declined";

  let homeowner: {
    name: string | null;
    email: string | null;
    phone: string | null;
    fub_person_id: string | null;
  } | null = null;

  if (args.homeownerId) {
    const { data } = await supabase
      .from("homeowners")
      .select("name, email, phone, fub_person_id")
      .eq("id", args.homeownerId)
      .single();
    homeowner = data;
  }

  const { data: property } = args.propertyId
    ? await supabase.from("properties").select("*").eq("id", args.propertyId).single()
    : { data: null };

  const { data: valuation } = args.valuationId
    ? await supabase.from("valuations").select("*").eq("id", args.valuationId).single()
    : { data: null };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("answers")
    .eq("id", args.conversationId)
    .single();

  const answers = (conversation?.answers || {}) as Answers;
  const { firstName, lastName } = splitName(homeowner?.name || answers.homeownerName);

  const message = property
    ? buildMessage({
        answers,
        property: property as PropertyRecord,
        valuation: (valuation as ValuationRecord) || null,
        consultation: {
          wants_review: args.wantsReview,
          channel: args.channel,
          preferred_time: args.preferredTime,
          status: args.status,
        },
      })
    : `Consultation ${args.status}. Channel: ${args.channel || "—"}. Time: ${
        args.preferredTime || "—"
      }`;

  const person: FubEventPayload["person"] = {
    firstName,
    lastName: lastName || undefined,
    tags: buildTags(answers, args.wantsReview),
    source: LEAD_SOURCE,
    customConsultationStatus: args.status,
    customConsultationChannel: args.channel || "",
  };
  if (homeowner?.email || answers.homeownerEmail) {
    person.emails = [{ value: (homeowner?.email || answers.homeownerEmail)! }];
  }
  if (homeowner?.phone || answers.homeownerPhone) {
    person.phones = [{ value: (homeowner?.phone || answers.homeownerPhone)! }];
  }

  try {
    const result = await postFubEvent({
      source: LEAD_SOURCE,
      system: "EstateValora",
      type: args.wantsReview ? "Seller Consultation" : "Property Inquiry",
      message,
      person,
    });

    if (result.ok && homeowner?.fub_person_id && args.wantsReview) {
      await updateFubPerson(homeowner.fub_person_id, {
        tags: ["Consultation Requested", "EstateValora"],
        customConsultationStatus: "requested",
        customConsultationChannel: args.channel || "",
      });
    }

    if (args.homeownerId && result.personId) {
      await supabase
        .from("homeowners")
        .update({
          fub_person_id: String(result.personId),
          fub_synced_at: new Date().toISOString(),
        })
        .eq("id", args.homeownerId);
    }

    await logIntegrationEvent({
      kind: "fub_sync",
      trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
      status: result.ok ? "success" : "failed",
      provider: "followupboss",
      externalId: result.personId != null ? String(result.personId) : null,
      payload: { response: result.raw },
      errorMessage: result.error,
    });
  } catch (err) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      consultationId: args.consultationId,
      status: "failed",
      provider: "followupboss",
      errorMessage: err instanceof Error ? err.message : "FUB consultation sync failed",
    });
  }
}
