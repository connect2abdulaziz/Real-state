import { Answers, ValuationRecord } from "@/lib/types";
import { formatCad } from "@/lib/report/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncConsultationToFub, syncValuationLeadToFub } from "@/lib/integrations/fub/sync";
import {
  sendConsultationEmails,
  sendValuationCompletedEmails,
} from "@/lib/integrations/email/send";
import {
  sendConsultationSms,
  sendValuationSms,
} from "@/lib/integrations/sms/send";

function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Phase B side-effects after valuation completes.
 * Runs fire-and-forget so the homeowner response is never blocked.
 */
export function runAfterValuationCompleted(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string;
  valuation: ValuationRecord | null;
  answers: Answers;
}): void {
  void (async () => {
    try {
      await syncValuationLeadToFub(args);

      const supabase = createAdminClient();
      let name = args.answers.homeownerName || null;
      let email = args.answers.homeownerEmail || null;
      let phone = args.answers.homeownerPhone || null;
      let address: string | null = null;

      if (args.homeownerId) {
        const { data } = await supabase
          .from("homeowners")
          .select("name, email, phone")
          .eq("id", args.homeownerId)
          .single();
        if (data) {
          name = data.name || name;
          email = data.email || email;
          phone = data.phone || phone;
        }
      }

      const { data: property } = await supabase
        .from("properties")
        .select("address")
        .eq("id", args.propertyId)
        .single();
      address = property?.address ?? null;

      const valuationOk = args.valuation?.status === "completed";
      const rangeLabel =
        valuationOk && args.valuation
          ? `${formatCad(args.valuation.estimated_value_low)} – ${formatCad(
              args.valuation.estimated_value_high
            )}`
          : null;

      await sendValuationCompletedEmails({
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        propertyId: args.propertyId,
        valuationId: args.valuation?.id ?? null,
        homeownerName: name,
        homeownerEmail: email,
        address,
        rangeLow: args.valuation?.estimated_value_low ?? null,
        rangeHigh: args.valuation?.estimated_value_high ?? null,
        valuationOk,
        appUrl: appBaseUrl(),
      });

      await sendValuationSms({
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        propertyId: args.propertyId,
        valuationId: args.valuation?.id ?? null,
        phone,
        valuationOk,
        rangeLabel,
      });
    } catch (err) {
      console.error("Phase B valuation side-effects failed:", err);
    }
  })();
}

/**
 * Phase B side-effects after consultation preference is saved.
 */
export function runAfterConsultation(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string | null;
  valuationId: string | null;
  consultationId: string;
  wantsReview: boolean;
  channel: string | null;
  preferredTime: string | null;
  status: string;
}): void {
  void (async () => {
    try {
      await syncConsultationToFub(args);

      const supabase = createAdminClient();
      let name: string | null = null;
      let email: string | null = null;
      let phone: string | null = null;
      let address: string | null = null;

      if (args.homeownerId) {
        const { data } = await supabase
          .from("homeowners")
          .select("name, email, phone")
          .eq("id", args.homeownerId)
          .single();
        if (data) {
          name = data.name;
          email = data.email;
          phone = data.phone;
        }
      }

      if (args.propertyId) {
        const { data } = await supabase
          .from("properties")
          .select("address")
          .eq("id", args.propertyId)
          .single();
        address = data?.address ?? null;
      }

      // Fallback to conversation answers if homeowner row incomplete
      if (!email || !name || !phone) {
        const { data: conversation } = await supabase
          .from("conversations")
          .select("answers")
          .eq("id", args.conversationId)
          .single();
        const answers = (conversation?.answers || {}) as Answers;
        name = name || answers.homeownerName || null;
        email = email || answers.homeownerEmail || null;
        phone = phone || answers.homeownerPhone || null;
      }

      await sendConsultationEmails({
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        propertyId: args.propertyId,
        valuationId: args.valuationId,
        consultationId: args.consultationId,
        wantsReview: args.wantsReview,
        channel: args.channel,
        preferredTime: args.preferredTime,
        homeownerName: name,
        homeownerEmail: email,
        address,
      });

      await sendConsultationSms({
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        consultationId: args.consultationId,
        phone,
        wantsReview: args.wantsReview,
        channel: args.channel,
      });
    } catch (err) {
      console.error("Phase B consultation side-effects failed:", err);
    }
  })();
}
