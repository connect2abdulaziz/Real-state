import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = body?.locale === "fr" ? "fr" : "en";
  const leadType = body?.leadType === "buyer" ? "buyer" : "seller";

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      status: "in_progress",
      transcript: [],
      answers: { locale },
      lead_type: leadType,
      locale,
    })
    .select("id, status, created_at, lead_type, locale")
    .single();

  if (error) {
    console.error("Failed to create conversation:", error);
    // Fallback if migration 0006 not applied yet
    const { data: fallback, error: fallbackError } = await supabase
      .from("conversations")
      .insert({
        status: "in_progress",
        transcript: [],
        answers: { locale, intent: leadType === "buyer" ? "buy" : "sell" },
      })
      .select("id, status, created_at")
      .single();

    if (fallbackError || !fallback) {
      return NextResponse.json(
        { error: "Could not start conversation" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        conversation: {
          ...fallback,
          lead_type: leadType,
          locale,
        },
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
