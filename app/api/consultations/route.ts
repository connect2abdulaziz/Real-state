import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAfterConsultation } from "@/lib/integrations/phase-b";

interface ConsultationBody {
  conversationId: string;
  propertyId?: string | null;
  homeownerId?: string | null;
  valuationId?: string | null;
  wantsReview: boolean;
  channel?: "phone" | "video" | null;
  preferredTime?: string | null;
}

/**
 * POST /api/consultations
 * Records whether the homeowner wants Ashkan's review and preferred channel.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as ConsultationBody;

  if (!body.conversationId || typeof body.wantsReview !== "boolean") {
    return NextResponse.json(
      { error: "conversationId and wantsReview are required" },
      { status: 400 }
    );
  }

  if (
    body.wantsReview &&
    body.channel &&
    !["phone", "video"].includes(body.channel)
  ) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      conversation_id: body.conversationId,
      property_id: body.propertyId || null,
      homeowner_id: body.homeownerId || null,
      valuation_id: body.valuationId || null,
      wants_review: body.wantsReview,
      channel: body.wantsReview ? body.channel || null : null,
      preferred_time: body.wantsReview
        ? body.preferredTime?.trim() || null
        : null,
      status: body.wantsReview ? "requested" : "declined",
    })
    .select("id, status, wants_review, channel, preferred_time")
    .single();

  if (error) {
    console.error("Failed to save consultation:", error);
    return NextResponse.json(
      { error: "Could not save consultation preference" },
      { status: 500 }
    );
  }

  runAfterConsultation({
    conversationId: body.conversationId,
    homeownerId: body.homeownerId || null,
    propertyId: body.propertyId || null,
    valuationId: body.valuationId || null,
    consultationId: data.id,
    wantsReview: body.wantsReview,
    channel: body.wantsReview ? body.channel || null : null,
    preferredTime: body.wantsReview
      ? body.preferredTime?.trim() || null
      : null,
    status: data.status,
  });

  const schedulingUrl = process.env.NEXT_PUBLIC_SCHEDULING_URL || null;

  return NextResponse.json({
    ok: true,
    consultation: data,
    schedulingUrl: body.wantsReview ? schedulingUrl : null,
  });
}
