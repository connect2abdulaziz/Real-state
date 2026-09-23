import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Answers, TranscriptMessage } from "@/lib/types";
import { buildPropertyInsert } from "@/lib/valuation/compose-property";
import { runValuation } from "@/lib/valuation/run-valuation";
import { runAfterValuationCompleted } from "@/lib/integrations/phase-b";

interface PatchBody {
  /** New messages to append to the transcript (AI question, notes, homeowner's reply). */
  appendTranscript?: TranscriptMessage[];
  /** New/updated answers to merge into the conversation's structured record. */
  answers?: Answers;
  /** Set true on the final submit to close out the conversation. */
  complete?: boolean;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as PatchBody;
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("conversations")
    .select("id, transcript, answers")
    .eq("id", params.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const mergedTranscript: TranscriptMessage[] = [
    ...(existing.transcript as TranscriptMessage[]),
    ...(body.appendTranscript ?? []),
  ];
  const mergedAnswers: Answers = {
    ...(existing.answers as Answers),
    ...(body.answers ?? {}),
  };

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      transcript: mergedTranscript,
      answers: mergedAnswers,
      status: body.complete ? "completed" : "in_progress",
    })
    .eq("id", params.id);

  if (updateError) {
    console.error("Failed to update conversation:", updateError);
    return NextResponse.json({ error: "Could not save answer" }, { status: 500 });
  }

  if (!body.complete) {
    return NextResponse.json({ ok: true });
  }

  let homeownerId: string | null = null;

  if (mergedAnswers.homeownerEmail || mergedAnswers.homeownerName) {
    const { data: homeowner, error: homeownerError } = await supabase
      .from("homeowners")
      .insert({
        name: mergedAnswers.homeownerName || null,
        email: mergedAnswers.homeownerEmail || null,
        phone: mergedAnswers.homeownerPhone || null,
      })
      .select("id")
      .single();

    if (homeownerError) {
      console.error("Failed to create homeowner:", homeownerError);
    } else {
      homeownerId = homeowner.id;
      await supabase
        .from("conversations")
        .update({ homeowner_id: homeownerId })
        .eq("id", params.id);
    }
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert(buildPropertyInsert(mergedAnswers, params.id, homeownerId))
    .select("id")
    .single();

  if (propertyError) {
    console.error("Failed to create property record:", propertyError);
    return NextResponse.json(
      { error: "Conversation saved, but the property record could not be created" },
      { status: 500 }
    );
  }

  let valuation = null;
  let valuationError: string | null = null;
  try {
    valuation = await runValuation({ propertyId: property.id });
    if (valuation.status === "failed") {
      valuationError = valuation.error_message;
    }
  } catch (err) {
    console.error("Valuation step failed:", err);
    valuationError =
      err instanceof Error ? err.message : "Unknown valuation error";
  }

  // Phase B (SOW 7 & 8): FUB + email/SMS — non-blocking.
  runAfterValuationCompleted({
    conversationId: params.id,
    homeownerId,
    propertyId: property.id,
    valuation,
    answers: mergedAnswers,
  });

  return NextResponse.json({
    ok: true,
    propertyId: property.id,
    homeownerId,
    valuation,
    valuationError,
  });
}
