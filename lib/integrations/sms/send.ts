import { logIntegrationEvent, IntegrationTrigger } from "@/lib/integrations/log";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim()
  );
}

async function sendSms(args: {
  to: string;
  body: string;
  trigger: IntegrationTrigger;
  conversationId?: string | null;
  homeownerId?: string | null;
  propertyId?: string | null;
  valuationId?: string | null;
  consultationId?: string | null;
}) {
  if (!isSmsConfigured()) {
    await logIntegrationEvent({
      kind: "sms",
      trigger: args.trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
      status: "skipped",
      provider: "twilio",
      errorMessage: "Twilio env vars not configured",
      payload: { to: args.to },
    });
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: args.to,
          From: from,
          Body: args.body,
        }),
      }
    );

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      await logIntegrationEvent({
        kind: "sms",
        trigger: args.trigger,
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        propertyId: args.propertyId,
        valuationId: args.valuationId,
        consultationId: args.consultationId,
        status: "failed",
        provider: "twilio",
        errorMessage:
          typeof raw === "object" && raw && "message" in raw
            ? String((raw as { message: string }).message)
            : `Twilio HTTP ${res.status}`,
        payload: { to: args.to, response: raw },
      });
      return;
    }

    await logIntegrationEvent({
      kind: "sms",
      trigger: args.trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
      status: "success",
      provider: "twilio",
      externalId:
        typeof raw === "object" && raw && "sid" in raw
          ? String((raw as { sid: string }).sid)
          : null,
      payload: { to: args.to },
    });
  } catch (err) {
    await logIntegrationEvent({
      kind: "sms",
      trigger: args.trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      status: "failed",
      provider: "twilio",
      errorMessage: err instanceof Error ? err.message : "SMS failed",
      payload: { to: args.to },
    });
  }
}

export async function sendValuationSms(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string;
  valuationId: string | null;
  phone: string | null;
  valuationOk: boolean;
  rangeLabel: string | null;
}) {
  if (!args.phone?.trim()) return;

  const body = args.valuationOk
    ? `Estate Valora: your preliminary estimate${
        args.rangeLabel ? ` (${args.rangeLabel})` : ""
      } is ready. Open the app to download your report. Not a certified appraisal.`
    : `Estate Valora: we received your property details. We'll follow up shortly.`;

  await sendSms({
    to: args.phone.trim(),
    body,
    trigger: args.valuationOk ? "report_ready" : "valuation_completed",
    conversationId: args.conversationId,
    homeownerId: args.homeownerId,
    propertyId: args.propertyId,
    valuationId: args.valuationId,
  });
}

export async function sendConsultationSms(args: {
  conversationId: string;
  homeownerId: string | null;
  consultationId: string;
  phone: string | null;
  wantsReview: boolean;
  channel: string | null;
}) {
  if (!args.phone?.trim() || !args.wantsReview) return;

  await sendSms({
    to: args.phone.trim(),
    body: `Estate Valora: we received your ${
      args.channel || "consultation"
    } request with Ashkan. Someone will follow up soon.`,
    trigger: "consultation_requested",
    conversationId: args.conversationId,
    homeownerId: args.homeownerId,
    consultationId: args.consultationId,
  });
}
