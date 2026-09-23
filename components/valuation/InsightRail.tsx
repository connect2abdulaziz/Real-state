"use client";

import { Answers } from "@/lib/types";
import { FIELD_LABELS } from "@/lib/valuation/steps";
import { MapPin, User, Compass, Shield } from "lucide-react";

const HIGHLIGHT_KEYS = [
  "streetAddress",
  "city",
  "propertyType",
  "bedrooms",
  "fullBathrooms",
  "livingArea",
  "condition",
  "motivation",
  "sellingTimeline",
  "homeownerName",
] as const;

/**
 * Right-rail context panel — uses spare horizontal space on large screens.
 */
export function InsightRail({
  started,
  finished,
  answers,
  currentAsk,
}: {
  started: boolean;
  finished: boolean;
  answers: Answers;
  currentAsk?: string;
}) {
  const highlights = HIGHLIGHT_KEYS.filter((k) => answers[k]).map((k) => ({
    label: FIELD_LABELS[k] || k,
    value: answers[k],
  }));

  return (
    <aside className="hidden xl:flex flex-col w-[300px] 2xl:w-[340px] shrink-0 h-full min-h-0">
      <div className="rounded-md border border-white/10 bg-surface/80 backdrop-blur-sm p-5 flex flex-col h-full min-h-0 overflow-y-auto">
        <p className="text-[11px] uppercase tracking-[0.16em] text-electric mb-4">
          {finished ? "Session summary" : "Live insight"}
        </p>

        {!started && (
          <div className="space-y-4">
            <h3 className="font-serif text-[22px] leading-snug text-foreground">
              A quieter way to understand value.
            </h3>
            <p className="text-[13px] text-foreground-muted leading-relaxed">
              One question at a time. Adaptive follow-ups. No long form — then a
              preliminary range you can download and discuss with Ashkan.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                "Guided conversation · 3–5 minutes",
                "Structured property record",
                "AI range + branded PDF report",
              ].map((item) => (
                <li
                  key={item}
                  className="text-[12px] text-foreground-muted flex gap-2"
                >
                  <span className="text-electric mt-0.5">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {started && !finished && (
          <div className="space-y-5 flex-1 min-h-0 flex flex-col">
            {currentAsk && (
              <div className="rounded-md border border-white/8 bg-surface-soft p-3.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-foreground-subtle mb-2 flex items-center gap-1.5">
                  <Compass size={12} className="text-electric" /> Now asking
                </p>
                <p className="text-[13px] text-foreground leading-relaxed">
                  {currentAsk}
                </p>
              </div>
            )}

            <div className="flex-1 min-h-0">
              <p className="text-[11px] uppercase tracking-[0.12em] text-foreground-subtle mb-3">
                Captured so far
              </p>
              {highlights.length === 0 ? (
                <p className="text-[13px] text-foreground-muted">
                  Your answers will appear here as you go.
                </p>
              ) : (
                <div className="space-y-3">
                  {highlights.map((h) => (
                    <div key={h.label} className="min-w-0">
                      <p className="text-[11px] text-foreground-subtle">
                        {h.label}
                      </p>
                      <p className="text-[13px] text-foreground break-words [overflow-wrap:anywhere]">
                        {h.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {finished && (
          <div className="space-y-5">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-electric shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-foreground-subtle uppercase tracking-[0.12em]">
                  Property
                </p>
                <p className="text-[14px] text-foreground break-words">
                  {[answers.streetAddress, answers.city, answers.postalCode]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={14} className="text-electric shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-foreground-subtle uppercase tracking-[0.12em]">
                  Prepared for
                </p>
                <p className="text-[14px] text-foreground">
                  {answers.homeownerName || "—"}
                </p>
                <p className="text-[12px] text-foreground-muted break-all">
                  {answers.homeownerEmail || ""}
                </p>
              </div>
            </div>
            <div className="rounded-md border border-white/8 bg-surface-soft p-3.5 flex gap-2">
              <Shield size={14} className="text-electric shrink-0 mt-0.5" />
              <p className="text-[12px] text-foreground-muted leading-relaxed">
                Download your report, then choose whether Ashkan personally
                reviews the estimate — booking is optional.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
