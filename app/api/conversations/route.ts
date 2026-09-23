import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Creates a new conversation row the moment the homeowner clicks "Start
// valuation". Everything from here on (transcript + structured answers)
// is written incrementally via PATCH /api/conversations/[id].
export async function POST() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({ status: "in_progress", transcript: [], answers: {} })
    .select("id, status, created_at")
    .single();

  if (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Could not start conversation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
