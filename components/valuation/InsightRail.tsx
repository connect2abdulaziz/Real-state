"use client";

import { Answers } from "@/lib/types";
import { FIELD_LABELS } from "@/lib/valuation/steps";
import {
  getSellerSteps,
  SELLER_FIELD_LABELS_FR,
} from "@/lib/valuation/seller-i18n";
import { BUYER_FIELD_LABELS } from "@/lib/buyer/steps";
import { retrievedFieldSet } from "@/lib/conversation/apply-property-facts";
import type { Locale } from "@/lib/i18n/copy";
import { UI } from "@/lib/i18n/copy";
import { MapPin, User, Compass, Shield } from "lucide-react";

/** Prefer these near the top when present; other captured fields follow. */
const PRIORITY_KEYS = [
  "streetAddress",
  "city",
  "postalCode",
  "propertyType",
  "ownership",
  "yearBuilt",
  "bedrooms",
  "fullBathrooms",
  "livingArea",
  "livingAreaUnit",
  "lotSize",
  "municipalAssessment",
  "condition",
  "hasBasement",
  "basementFinished",
  "garageType",
  "parkingSpaces",
  "hasRenovations",
  "renovationTypes",
  "motivation",
  "sellingTimeline",
  "preferredCity",
  "buyerPropertyType",
  "buyerBudget",
  "buyingTimeline",
  "homeownerName",
  "homeownerEmail",
] as const;

const HIDDEN_KEYS = new Set([
  "locale",
  "intent",
  "inputMode",
  "propertyNarrative",
  "leadType",
  "addressConfirm",
]);

const MAX_VISIBLE = 15;

function labelFor(key: string, locale: Locale): string {
  if (locale === "fr") {
    return (
      SELLER_FIELD_LABELS_FR[key] ||
      BUYER_FIELD_LABELS[key]?.fr ||
      FIELD_LABELS[key] ||
      key
    );
  }
  return FIELD_LABELS[key] || BUYER_FIELD_LABELS[key]?.en || key;
}

function valueFor(key: string, value: string, locale: Locale): string {
  if (!value) return value;
  const copy = UI[locale];
  if (value === "Yes" || value === "Oui") return copy.yes;
  if (value === "No" || value === "Non") return copy.no;
  if (key === "livingArea" && locale) {
    return value;
  }
  if (locale !== "fr") return value;
  const step = getSellerSteps("fr").find((s) => s.id === key);
  if (!step?.options?.length) return value;
  const labels = step.optionLabels || step.options;
  if (value.includes(",")) {
    return value
      .split(",")
      .map((part) => {
        const idx = step.options!.indexOf(part.trim());
        return idx >= 0 ? labels[idx] ?? part.trim() : part.trim();
      })
      .join(", ");
  }
  const idx = step.options.indexOf(value);
  return idx >= 0 ? labels[idx] ?? value : value;
}

function collectedEntries(answers: Answers, locale: Locale) {
  const entries: { key: string; label: string; value: string }[] = [];
  const seen = new Set<string>();
  const retrieved = retrievedFieldSet(answers);
  const suffix = UI[locale].retrievedSuffix;

  const push = (key: string) => {
    if (seen.has(key)) return;
    if (key.startsWith("_")) return;
    if (HIDDEN_KEYS.has(key)) return;
    // Assessment is stored for valuation; skip cluttering the rail unless retrieved
    if (key === "municipalAssessment" && !retrieved.has(key)) return;
    const raw = answers[key];
    if (!raw || raw === "Skipped") return;
    seen.add(key);
    const base = labelFor(key, locale);
    const label =
      retrieved.has(key) && suffix ? `${base} ${suffix}` : base;
    entries.push({
      key,
      label,
      value: valueFor(key, raw, locale),
    });
  };

  for (const key of PRIORITY_KEYS) push(key);
  for (const key of Object.keys(answers)) push(key);

  return entries;
}

export function InsightRail({
  started,
  finished,
  answers,
  currentAsk,
  locale = "en",
}: {
  started: boolean;
  finished: boolean;
  answers: Answers;
  currentAsk?: string;
  locale?: Locale;
}) {
  const copy = UI[locale];
  const all = collectedEntries(answers, locale);
  const visible = all.slice(0, MAX_VISIBLE);
  const extra = all.length - visible.length;

  return (
    <aside className="hidden xl:flex flex-col w-[300px] 2xl:w-[340px] shrink-0 h-full min-h-0">
      <div className="rounded-md border border-white/10 bg-surface/80 backdrop-blur-sm p-5 flex flex-col h-full min-h-0 overflow-y-auto">
        <p className="text-[11px] uppercase tracking-[0.16em] text-electric mb-4">
          {finished ? copy.sessionSummary : copy.liveInsight}
        </p>

        {!started && (
          <div className="space-y-4">
            <h3 className="font-serif text-[22px] leading-snug text-foreground">
              {copy.insightIdleTitle}
            </h3>
            <p className="text-[13px] text-foreground-muted leading-relaxed">
              {copy.insightIdleBody}
            </p>
            <ul className="space-y-3 pt-2">
              {copy.bullets.map((item) => (
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
                  <Compass size={12} className="text-electric" />{" "}
                  {copy.nowAsking}
                </p>
                <p className="text-[13px] text-foreground leading-relaxed">
                  {currentAsk}
                </p>
              </div>
            )}

            <div className="flex-1 min-h-0">
              <p className="text-[11px] uppercase tracking-[0.12em] text-foreground-subtle mb-3">
                {copy.collected}
              </p>
              {visible.length === 0 ? (
                <p className="text-[13px] text-foreground-muted">
                  {copy.waitingAnswers}
                </p>
              ) : (
                <div className="space-y-3">
                  {visible.map((h) => (
                    <div key={h.key} className="min-w-0">
                      <p className="text-[11px] text-foreground-subtle">
                        {h.label}
                      </p>
                      <p className="text-[13px] text-foreground break-words [overflow-wrap:anywhere]">
                        {h.value}
                      </p>
                    </div>
                  ))}
                  {extra > 0 && (
                    <p className="text-[12px] text-foreground-subtle">
                      {copy.moreCollected.replace("{count}", String(extra))}
                    </p>
                  )}
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
                  {copy.property}
                </p>
                <p className="text-[14px] text-foreground break-words">
                  {[
                    answers.streetAddress || answers.preferredCity,
                    answers.city,
                    answers.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={14} className="text-electric shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-foreground-subtle uppercase tracking-[0.12em]">
                  {copy.preparedFor}
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
                {copy.nextHint}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
