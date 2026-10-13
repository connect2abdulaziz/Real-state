"use client";

import { ConsultationCTA } from "@/components/valuation/ConsultationCTA";
import { BUYER_FIELD_LABELS, qualifyBuyer } from "@/lib/buyer/steps";
import type { Locale } from "@/lib/i18n/copy";
import { Answers } from "@/lib/types";

export function BuyerResultPanel({
  answers,
  locale,
  conversationId,
  homeownerId,
  doneMessage,
  panelTitle,
  panelNote,
}: {
  answers: Answers;
  locale: Locale;
  conversationId: string | null;
  homeownerId: string | null;
  doneMessage: string;
  panelTitle: string;
  panelNote: string;
}) {
  const q = qualifyBuyer(answers);
  const qualLabel = locale === "fr" ? q.labelFr : q.label;

  return (
    <div className="mt-2 space-y-4">
      <div className="rounded-md border border-electric/25 bg-electric/10 px-4 py-4">
        <p className="text-[13px] text-foreground leading-relaxed">{doneMessage}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
          {locale === "fr" ? "Qualification" : "Qualification"}
        </p>
        <p className="mt-1 text-[1.1rem] font-medium text-electric">{qualLabel}</p>
      </div>

      <ConsultationCTA
        conversationId={conversationId}
        propertyId={null}
        homeownerId={homeownerId}
        valuationId={null}
      />

      <div className="rounded-md border border-white/10 bg-surface-soft p-4 sm:p-6 min-w-0 overflow-hidden">
        <p className="text-[13px] font-semibold mb-4 text-foreground">
          {panelTitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 text-[13px] min-w-0">
          {Object.entries(answers)
            .filter(([k]) => k !== "intent")
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <p className="text-[11px] text-foreground-subtle uppercase tracking-[0.08em] mb-0.5">
                  {BUYER_FIELD_LABELS[k]?.[locale] ||
                    BUYER_FIELD_LABELS[k]?.en ||
                    k}
                </p>
                <p className="text-foreground break-words [overflow-wrap:anywhere]">
                  {v || "—"}
                </p>
              </div>
            ))}
        </div>
        <div className="mt-5 pt-4 border-t border-white/10 text-[12px] leading-relaxed text-foreground-muted">
          {panelNote}
        </div>
      </div>
    </div>
  );
}
