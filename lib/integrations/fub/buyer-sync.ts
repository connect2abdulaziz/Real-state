import { Answers } from "@/lib/types";
import { qualifyBuyer } from "@/lib/buyer/steps";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FubEventPayload,
  isFubConfigured,
  postFubEvent,
  updateFubPerson,
} from "@/lib/integrations/fub/client";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { splitName } from "@/lib/integrations/fub/sync";

const LEAD_SOURCE = "EstateValora – AI Buyer Consultation";

function buildBuyerMessage(answers: Answers): string {
  const q = qualifyBuyer(answers);
  return [
    "Estate Valora — AI buyer lead",
    "",
    `Qualification: ${q.label}`,
    `Preferred area: ${answers.preferredCity || "—"}`,
    `Neighbourhoods: ${answers.preferredNeighborhoods || "—"}`,
    `Property type: ${answers.buyerPropertyType || "—"}`,
    `Bedrooms: ${answers.buyerBeds || "—"}`,
    `Budget: ${answers.buyerBudget || "—"}`,
    `Pre-approved: ${answers.preApproved || "—"}`,
    `Buying timeline: ${answers.buyingTimeline || "—"}`,
    `First-time buyer: ${answers.firstTimeBuyer || "—"}`,
    `Must sell first: ${answers.mustSellFirst || "—"}`,
    `Priorities: ${answers.buyerPriorities || "—"}`,
    `Notes: ${answers.buyerNotes || "—"}`,
    `Language: ${answers.locale || "en"}`,
  ].join("\n");
}

function buildBuyerTags(answers: Answers): string[] {
  const q = qualifyBuyer(answers);
  const tags = ["EstateValora", "Buyer Lead", `Buyer: ${q.label}`];
  if (answers.buyingTimeline)
    tags.push(`Buy timeline: ${answers.buyingTimeline}`);
  if (answers.buyerBudget) tags.push(`Budget: ${answers.buyerBudget}`);
  if (answers.preferredCity) tags.push(`Area: ${answers.preferredCity}`);
  if (answers.locale === "fr") tags.push("Locale: FR");
  return tags.slice(0, 12);
}

export async function syncBuyerLeadToFub(args: {
  conversationId: string;
  homeownerId: string | null;
  answers: Answers;
}): Promise<void> {
  const supabase = createAdminClient();

  if (!isFubConfigured()) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "buyer_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      status: "skipped",
      provider: "followupboss",
      errorMessage: "FOLLOW_UP_BOSS_API_KEY not configured",
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

  const person: FubEventPayload["person"] = {
    firstName,
    lastName: lastName || undefined,
    tags: buildBuyerTags(args.answers),
    source: LEAD_SOURCE,
  };
  if (email) person.emails = [{ value: email }];
  if (phone) person.phones = [{ value: phone }];
  if (args.answers.preferredCity) {
    person.addresses = [
      {
        type: "home",
        city: args.answers.preferredCity,
        country: "Canada",
      },
    ];
  }

  const payload: FubEventPayload = {
    source: LEAD_SOURCE,
    system: "EstateValora",
    type: "Buyer Inquiry",
    message: buildBuyerMessage(args.answers),
    person,
  };

  try {
    const result = await postFubEvent(payload);
    if (!result.ok) {
      await logIntegrationEvent({
        kind: "fub_sync",
        trigger: "buyer_completed",
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        status: "failed",
        provider: "followupboss",
        payload: { request: payload, response: result.raw },
        errorMessage: result.error,
      });
      return;
    }

    const personId =
      result.personId != null ? String(result.personId) : null;
    if (homeowner?.id && personId) {
      await supabase
        .from("homeowners")
        .update({
          fub_person_id: personId,
          fub_synced_at: new Date().toISOString(),
        })
        .eq("id", homeowner.id);

      try {
        await updateFubPerson(personId, {
          tags: buildBuyerTags(args.answers),
          source: LEAD_SOURCE,
        });
      } catch {
        // non-fatal
      }
    }

    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "buyer_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      status: "success",
      provider: "followupboss",
      externalId: personId,
      payload: { response: result.raw },
    });
  } catch (err) {
    await logIntegrationEvent({
      kind: "fub_sync",
      trigger: "buyer_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      status: "failed",
      provider: "followupboss",
      errorMessage: err instanceof Error ? err.message : "FUB sync failed",
    });
  }
}
