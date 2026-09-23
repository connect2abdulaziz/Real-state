"use client";

import { useState } from "react";
import { CheckCircle2, Phone, Video } from "lucide-react";

type Step = "ask" | "channel" | "time" | "done";

export function ConsultationCTA({
  conversationId,
  propertyId,
  homeownerId,
  valuationId,
}: {
  conversationId: string | null;
  propertyId?: string | null;
  homeownerId?: string | null;
  valuationId?: string | null;
}) {
  const [step, setStep] = useState<Step>("ask");
  const [channel, setChannel] = useState<"phone" | "video" | null>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);

  async function submit(payload: {
    wantsReview: boolean;
    channel?: "phone" | "video" | null;
    preferredTime?: string | null;
  }) {
    if (!conversationId) {
      setError("Conversation not ready yet.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          propertyId,
          homeownerId,
          valuationId,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setSchedulingUrl(data.schedulingUrl || null);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preference");
    } finally {
      setSaving(false);
    }
  }

  if (step === "done") {
    return (
      <div className="mt-4 rounded-md border border-white/10 bg-surface-soft p-3 sm:p-4">
        <div className="flex gap-2 items-start">
          <CheckCircle2 size={16} className="text-electric shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground mb-1">
              {channel
                ? "Consultation request received"
                : "Thanks — explore at your pace"}
            </p>
            <p className="text-[12px] text-foreground-muted leading-relaxed">
              {channel
                ? `Ashkan’s team will follow up about a ${
                    channel === "phone" ? "phone" : "video"
                  } consultation${
                    preferredTime ? ` (${preferredTime})` : ""
                  }. You can still download your report anytime.`
                : "You can download your Estate Valora report and revisit a professional review whenever you’re ready."}
            </p>
            {schedulingUrl && (
              <a
                href={schedulingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-[12px] text-electric border-b border-electric/40 hover:border-electric"
              >
                Open scheduling calendar →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-electric/25 bg-surface-soft p-3 sm:p-4 min-w-0">
      {step === "ask" && (
        <>
          <p className="text-[12px] font-medium text-electric uppercase tracking-[0.12em] mb-2">
            Personal review
          </p>
          <p className="text-[14px] text-foreground leading-relaxed mb-3">
            Would you like Ashkan to personally review your valuation and give
            you his professional opinion on the current market value of your
            property?
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setStep("channel")}
              className="px-4 py-2.5 rounded-full bg-white text-background text-[13px] font-medium disabled:opacity-50"
            >
              Yes, I&apos;d like a professional review
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit({ wantsReview: false })}
              className="px-4 py-2.5 rounded-full border border-white/15 text-foreground-muted text-[13px] disabled:opacity-50"
            >
              No, I&apos;m just exploring
            </button>
          </div>
        </>
      )}

      {step === "channel" && (
        <>
          <p className="text-[14px] text-foreground leading-relaxed mb-3">
            Great. Would you prefer a quick phone call or a video consultation?
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setChannel("phone");
                setStep("time");
              }}
              className="px-4 py-2.5 rounded-full border border-white/15 bg-white/[0.04] text-foreground text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-white/[0.1]"
            >
              <Phone size={14} /> Phone
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setChannel("video");
                setStep("time");
              }}
              className="px-4 py-2.5 rounded-full border border-white/15 bg-white/[0.04] text-foreground text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-white/[0.1]"
            >
              <Video size={14} /> Video / Zoom
            </button>
          </div>
          <button
            type="button"
            className="mt-3 text-[12px] text-foreground-subtle"
            onClick={() => setStep("ask")}
          >
            ← Back
          </button>
        </>
      )}

      {step === "time" && channel && (
        <>
          <p className="text-[14px] text-foreground leading-relaxed mb-3">
            What would be the best time for you?
          </p>
          <input
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            placeholder="e.g. Weekday mornings, or Thursday after 5pm"
            className="w-full min-w-0 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-subtle focus:border-electric/60 mb-3"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                submit({
                  wantsReview: true,
                  channel,
                  preferredTime: preferredTime.trim() || null,
                })
              }
              className="px-4 py-2.5 rounded-full bg-white text-background text-[13px] font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Submit request"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                submit({
                  wantsReview: true,
                  channel,
                  preferredTime: null,
                })
              }
              className="px-4 py-2.5 rounded-full border border-white/15 text-foreground-muted text-[13px] disabled:opacity-50"
            >
              Skip time for now
            </button>
          </div>
          <button
            type="button"
            className="mt-3 text-[12px] text-foreground-subtle"
            onClick={() => setStep("channel")}
          >
            ← Back
          </button>
        </>
      )}

      {error && (
        <p className="text-[12px] text-warm mt-3 break-words">{error}</p>
      )}

      <p className="text-[11px] text-foreground-subtle mt-3 leading-relaxed">
        You can receive and review your valuation without booking a
        consultation.
      </p>
    </div>
  );
}
