import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Answers, ValuationRecord } from "@/lib/types";
import { buildPropertyInsert } from "@/lib/valuation/compose-property";
import { syncValuationLeadToFub, syncConsultationToFub } from "@/lib/integrations/fub/sync";
import {
  sendValuationCompletedEmails,
  sendConsultationEmails,
} from "@/lib/integrations/email/send";
import { formatCad } from "@/lib/report/types";

const TEST_EMAIL = "abdulazizkhan6292@gmail.com";

const DUMMY_ANSWERS: Answers = {
  streetAddress: "123 Rue Saint-Denis",
  city: "Montreal",
  postalCode: "H2X 3K4",
  propertyType: "Single-family home",
  ownership: "Yes",
  yearBuilt: "1998",
  livingArea: "1800",
  livingAreaUnit: "Square feet",
  lotSize: "5000 sq ft",
  bedrooms: "3",
  fullBathrooms: "2",
  powderRooms: "1",
  parkingSpaces: "2",
  garageType: "Single garage",
  hasBasement: "Yes",
  basementFinished: "Yes",
  basementDetail: "Fully finished",
  hasPool: "No",
  outdoorFeatures: "Large backyard, Landscaped yard",
  numberOfFloors: "2",
  hasRenovations: "Yes",
  renovationTypes: "Kitchen, Bathrooms",
  renovationDates: "Kitchen 2022; bathrooms 2021",
  condition: "Very well maintained",
  additional: "Quiet street near park",
  hasValueIdea: "Yes",
  expectedValue: "around $650,000",
  purchasePrice: "$420,000",
  purchaseYear: "2015",
  motivation: "I'm thinking about selling",
  sellingTimeline: "Within 0–3 months",
  homeownerName: "Abdul Aziz",
  homeownerEmail: TEST_EMAIL,
  homeownerPhone: "",
};

function devToolsAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEV_TOOLS === "true"
  );
}

/**
 * POST /api/dev/smoke-test
 * Seeds a completed dummy valuation and runs FUB + Resend (no chat, no OpenAI).
 */
export async function POST() {
  if (!devToolsAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const results: Record<string, unknown> = {
    email: TEST_EMAIL,
    steps: [] as string[],
  };

  try {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        status: "completed",
        transcript: [
          {
            from: "ai",
            text: "[DEV SMOKE TEST] Dummy conversation for FUB + Resend.",
            at: new Date().toISOString(),
          },
        ],
        answers: DUMMY_ANSWERS,
      })
      .select("id")
      .single();

    if (convError || !conversation) {
      throw new Error(convError?.message || "Could not create conversation");
    }
    (results.steps as string[]).push("conversation created");

    const { data: homeowner, error: homeownerError } = await supabase
      .from("homeowners")
      .insert({
        name: DUMMY_ANSWERS.homeownerName,
        email: TEST_EMAIL,
        phone: null,
      })
      .select("id")
      .single();

    if (homeownerError || !homeowner) {
      throw new Error(homeownerError?.message || "Could not create homeowner");
    }

    await supabase
      .from("conversations")
      .update({ homeowner_id: homeowner.id })
      .eq("id", conversation.id);
    (results.steps as string[]).push("homeowner created");

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert(buildPropertyInsert(DUMMY_ANSWERS, conversation.id, homeowner.id))
      .select("id, address")
      .single();

    if (propertyError || !property) {
      throw new Error(propertyError?.message || "Could not create property");
    }
    (results.steps as string[]).push("property created");

    const { data: valuation, error: valuationError } = await supabase
      .from("valuations")
      .insert({
        property_id: property.id,
        conversation_id: conversation.id,
        homeowner_id: homeowner.id,
        status: "completed",
        estimated_value_low: 620000,
        estimated_value_high: 695000,
        confidence: "medium",
        factors_increasing_value: [
          {
            factor: "Living area",
            explanation: "1,800 sq ft is competitive for the area.",
          },
          {
            factor: "Renovations",
            explanation: "Recent kitchen and bathroom updates support value.",
          },
        ],
        factors_decreasing_value: [
          {
            factor: "Limited market comps in Phase 1",
            explanation: "Estimate uses available info only — no MLS comps.",
          },
        ],
        property_strengths: ["Well maintained", "Finished basement"],
        potential_considerations: ["Self-reported condition"],
        market_observations: ["Phase 1: no MLS data supplied"],
        explanation:
          "This is a DEV smoke-test valuation used to verify Follow Up Boss and Resend email delivery.",
        limitations:
          "Smoke-test record — not a live OpenAI valuation.",
        model: "dev-smoke-test",
        prompt_version: "dev",
      })
      .select("*")
      .single();

    if (valuationError || !valuation) {
      throw new Error(valuationError?.message || "Could not create valuation");
    }
    (results.steps as string[]).push("valuation created (dummy, no OpenAI)");

    const typedValuation = valuation as ValuationRecord;

    await syncValuationLeadToFub({
      conversationId: conversation.id,
      homeownerId: homeowner.id,
      propertyId: property.id,
      valuation: typedValuation,
      answers: DUMMY_ANSWERS,
    });
    (results.steps as string[]).push("FUB sync attempted");

    await sendValuationCompletedEmails({
      conversationId: conversation.id,
      homeownerId: homeowner.id,
      propertyId: property.id,
      valuationId: typedValuation.id,
      homeownerName: DUMMY_ANSWERS.homeownerName,
      homeownerEmail: TEST_EMAIL,
      address: property.address,
      rangeLow: Number(typedValuation.estimated_value_low),
      rangeHigh: Number(typedValuation.estimated_value_high),
      valuationOk: true,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    });
    (results.steps as string[]).push(`emails sent to ${TEST_EMAIL} + brokerage`);

    const { data: consultation, error: consultError } = await supabase
      .from("consultations")
      .insert({
        conversation_id: conversation.id,
        property_id: property.id,
        homeowner_id: homeowner.id,
        valuation_id: typedValuation.id,
        wants_review: true,
        channel: "phone",
        preferred_time: "Weekday mornings (smoke test)",
        status: "requested",
      })
      .select("id, status")
      .single();

    if (!consultError && consultation) {
      await syncConsultationToFub({
        conversationId: conversation.id,
        homeownerId: homeowner.id,
        propertyId: property.id,
        valuationId: typedValuation.id,
        consultationId: consultation.id,
        wantsReview: true,
        channel: "phone",
        preferredTime: "Weekday mornings (smoke test)",
        status: "requested",
      });

      await sendConsultationEmails({
        conversationId: conversation.id,
        homeownerId: homeowner.id,
        propertyId: property.id,
        valuationId: typedValuation.id,
        consultationId: consultation.id,
        wantsReview: true,
        channel: "phone",
        preferredTime: "Weekday mornings (smoke test)",
        homeownerName: DUMMY_ANSWERS.homeownerName,
        homeownerEmail: TEST_EMAIL,
        address: property.address,
      });
      (results.steps as string[]).push("consultation FUB + emails attempted");
      results.consultationId = consultation.id;
    }

    const { data: events } = await supabase
      .from("integration_events")
      .select("kind, trigger, status, provider, error_message, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false });

    results.ok = true;
    results.conversationId = conversation.id;
    results.homeownerId = homeowner.id;
    results.propertyId = property.id;
    results.valuationId = typedValuation.id;
    results.range = `${formatCad(Number(typedValuation.estimated_value_low))} – ${formatCad(
      Number(typedValuation.estimated_value_high)
    )}`;
    results.integrationEvents = events || [];
    results.check = {
      inbox: TEST_EMAIL,
      brokerage: process.env.BROKERAGE_NOTIFY_EMAIL || "(not set)",
      fub: "Follow Up Boss → People (search Abdul Aziz or the email)",
      db: "Supabase → integration_events",
    };

    return NextResponse.json(results);
  } catch (err) {
    console.error("Smoke test failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Smoke test failed",
        results,
      },
      { status: 500 }
    );
  }
}
