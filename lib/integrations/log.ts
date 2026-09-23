import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationKind = "fub_sync" | "email" | "sms";
export type IntegrationTrigger =
  | "valuation_completed"
  | "consultation_requested"
  | "consultation_declined"
  | "report_ready";
export type IntegrationStatus = "pending" | "success" | "failed" | "skipped";

export async function logIntegrationEvent(args: {
  kind: IntegrationKind;
  trigger: IntegrationTrigger;
  conversationId?: string | null;
  homeownerId?: string | null;
  propertyId?: string | null;
  valuationId?: string | null;
  consultationId?: string | null;
  status: IntegrationStatus;
  provider?: string | null;
  externalId?: string | null;
  payload?: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("integration_events").insert({
      kind: args.kind,
      trigger: args.trigger,
      conversation_id: args.conversationId ?? null,
      homeowner_id: args.homeownerId ?? null,
      property_id: args.propertyId ?? null,
      valuation_id: args.valuationId ?? null,
      consultation_id: args.consultationId ?? null,
      status: args.status,
      provider: args.provider ?? null,
      external_id: args.externalId ?? null,
      payload: args.payload ?? {},
      error_message: args.errorMessage ?? null,
    });
  } catch (err) {
    console.error("Failed to write integration_events row:", err);
  }
}
