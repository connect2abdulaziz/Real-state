import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runValuation } from "@/lib/valuation/run-valuation";
import { runAfterValuationCompleted } from "@/lib/integrations/phase-b";
import { syncValuationLeadToFub } from "@/lib/integrations/fub/sync";
import type { Answers } from "@/lib/types";

/**
 * Admin: re-run OpenAI valuation for a property.
 * Body: { propertyId: string, notify?: boolean }
 * - notify=false (default): update FUB only, no new emails/SMS
 * - notify=true: full Phase B (FUB + email + SMS)
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const propertyId =
    typeof body.propertyId === "string" ? body.propertyId : "";
  const notify = Boolean(body.notify);

  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, conversation_id, homeowner_id")
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const valuation = await runValuation({ propertyId });

    const { data: conversation } = await supabase
      .from("conversations")
      .select("answers")
      .eq("id", property.conversation_id)
      .single();

    const answers = (conversation?.answers || {}) as Answers;

    if (notify) {
      runAfterValuationCompleted({
        conversationId: property.conversation_id,
        homeownerId: property.homeowner_id,
        propertyId: property.id,
        valuation,
        answers,
      });
    } else if (valuation.status === "completed") {
      await syncValuationLeadToFub({
        conversationId: property.conversation_id,
        homeownerId: property.homeowner_id,
        propertyId: property.id,
        valuation,
        answers,
      });
    }

    return NextResponse.json({
      ok: true,
      valuation,
      notified: notify,
    });
  } catch (err) {
    console.error("Admin regenerate valuation failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not regenerate valuation",
      },
      { status: 500 }
    );
  }
}
