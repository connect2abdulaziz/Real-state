import { Resend } from "resend";
import { logIntegrationEvent, IntegrationTrigger } from "@/lib/integrations/log";
import { formatCad } from "@/lib/report/types";

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Estate Valora <onboarding@resend.dev>"
  );
}

function brokerageInbox(): string | null {
  return process.env.BROKERAGE_NOTIFY_EMAIL?.trim() || null;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  trigger: IntegrationTrigger;
  conversationId?: string | null;
  homeownerId?: string | null;
  propertyId?: string | null;
  valuationId?: string | null;
  consultationId?: string | null;
}) {
  if (!isEmailConfigured()) {
    await logIntegrationEvent({
      kind: "email",
      trigger: args.trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
      status: "skipped",
      provider: "resend",
      errorMessage: "RESEND_API_KEY not configured",
      payload: { to: args.to, subject: args.subject },
    });
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const result = await resend.emails.send({
      from: fromAddress(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });

    if (result.error) {
      await logIntegrationEvent({
        kind: "email",
        trigger: args.trigger,
        conversationId: args.conversationId,
        homeownerId: args.homeownerId,
        propertyId: args.propertyId,
        valuationId: args.valuationId,
        consultationId: args.consultationId,
        status: "failed",
        provider: "resend",
        errorMessage: result.error.message,
        payload: { to: args.to, subject: args.subject },
      });
      return;
    }

    await logIntegrationEvent({
      kind: "email",
      trigger: args.trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
      status: "success",
      provider: "resend",
      externalId: result.data?.id ?? null,
      payload: { to: args.to, subject: args.subject },
    });
  } catch (err) {
    await logIntegrationEvent({
      kind: "email",
      trigger: args.trigger,
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
      status: "failed",
      provider: "resend",
      errorMessage: err instanceof Error ? err.message : "Email send failed",
      payload: { to: args.to, subject: args.subject },
    });
  }
}

export async function sendValuationCompletedEmails(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string;
  valuationId: string | null;
  homeownerName: string | null;
  homeownerEmail: string | null;
  address: string | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  valuationOk: boolean;
  appUrl: string;
}) {
  const name = args.homeownerName || "there";
  const range =
    args.valuationOk && args.rangeLow != null && args.rangeHigh != null
      ? `${formatCad(args.rangeLow)} – ${formatCad(args.rangeHigh)}`
      : null;

  if (args.homeownerEmail) {
    const subject = args.valuationOk
      ? "Your Estate Valora valuation is ready"
      : "We received your Estate Valora submission";

    const html = `
      <div style="font-family:Georgia,serif;color:#111;line-height:1.5">
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thank you for completing your Estate Valora conversation.</p>
        ${
          range
            ? `<p>Your preliminary AI-assisted estimate is <strong>${escapeHtml(
                range
              )}</strong>.</p>
               <p>You can download your branded PDF report from the valuation page.</p>`
            : `<p>Your property details were saved. Our team will follow up if the estimate needs a moment longer.</p>`
        }
        <p style="color:#555;font-size:13px">This is an AI-assisted preliminary estimate — not a certified appraisal — and is subject to review by Ashkan Shamloo, Licensed Real Estate Broker.</p>
        <p><a href="${escapeHtml(args.appUrl)}/valuation">Return to Estate Valora</a></p>
      </div>
    `;

    await sendEmail({
      to: args.homeownerEmail,
      subject,
      html,
      text: `Hi ${name}, thank you for your Estate Valora submission. ${
        range ? `Preliminary range: ${range}.` : ""
      } Not a certified appraisal.`,
      trigger: args.valuationOk ? "report_ready" : "valuation_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
    });
  }

  const brokerage = brokerageInbox();
  if (brokerage) {
    await sendEmail({
      to: brokerage,
      subject: `New Estate Valora lead${args.address ? `: ${args.address}` : ""}`,
      html: `
        <div style="font-family:system-ui,sans-serif;line-height:1.5">
          <p><strong>New valuation lead</strong></p>
          <p>Name: ${escapeHtml(args.homeownerName || "—")}<br/>
          Email: ${escapeHtml(args.homeownerEmail || "—")}<br/>
          Address: ${escapeHtml(args.address || "—")}<br/>
          Range: ${escapeHtml(range || "unavailable")}</p>
          <p>Source: EstateValora – AI Property Valuation</p>
        </div>
      `,
      text: `New Estate Valora lead. ${args.homeownerName || ""} ${args.homeownerEmail || ""} ${args.address || ""} ${range || ""}`,
      trigger: "valuation_completed",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
    });
  }
}

export async function sendConsultationEmails(args: {
  conversationId: string;
  homeownerId: string | null;
  propertyId: string | null;
  valuationId: string | null;
  consultationId: string;
  wantsReview: boolean;
  channel: string | null;
  preferredTime: string | null;
  homeownerName: string | null;
  homeownerEmail: string | null;
  address: string | null;
}) {
  const name = args.homeownerName || "there";

  if (args.homeownerEmail && args.wantsReview) {
    await sendEmail({
      to: args.homeownerEmail,
      subject: "We received your consultation request",
      html: `
        <div style="font-family:Georgia,serif;line-height:1.5">
          <p>Hi ${escapeHtml(name)},</p>
          <p>Thanks — Ashkan’s team received your request for a professional review${
            args.channel ? ` via ${escapeHtml(args.channel)}` : ""
          }${
            args.preferredTime
              ? ` (preferred time: ${escapeHtml(args.preferredTime)})`
              : ""
          }.</p>
          <p>Someone will follow up shortly.</p>
        </div>
      `,
      text: `Hi ${name}, we received your consultation request. Ashkan’s team will follow up shortly.`,
      trigger: "consultation_requested",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
    });
  }

  const brokerage = brokerageInbox();
  if (brokerage && args.wantsReview) {
    await sendEmail({
      to: brokerage,
      subject: `Consultation requested${args.address ? `: ${args.address}` : ""}`,
      html: `
        <div style="font-family:system-ui,sans-serif;line-height:1.5">
          <p><strong>Homeowner requested Ashkan’s review</strong></p>
          <p>Name: ${escapeHtml(args.homeownerName || "—")}<br/>
          Email: ${escapeHtml(args.homeownerEmail || "—")}<br/>
          Address: ${escapeHtml(args.address || "—")}<br/>
          Channel: ${escapeHtml(args.channel || "—")}<br/>
          Preferred time: ${escapeHtml(args.preferredTime || "—")}</p>
        </div>
      `,
      text: `Consultation requested by ${args.homeownerName || ""} ${args.channel || ""} ${args.preferredTime || ""}`,
      trigger: "consultation_requested",
      conversationId: args.conversationId,
      homeownerId: args.homeownerId,
      propertyId: args.propertyId,
      valuationId: args.valuationId,
      consultationId: args.consultationId,
    });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
