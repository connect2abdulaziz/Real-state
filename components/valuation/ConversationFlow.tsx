"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Home, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { FIELD_LABELS, SECTIONS } from "@/lib/valuation/steps";
import {
  getSellerSteps,
  SELLER_FIELD_LABELS_FR,
  visibleSellerSteps,
} from "@/lib/valuation/seller-i18n";
import {
  BUYER_FIELD_LABELS,
  BUYER_SECTIONS,
  visibleBuyerSteps,
} from "@/lib/buyer/steps";
import {
  Answers,
  ConversationStep,
  TranscriptMessage,
  ValuationRecord,
} from "@/lib/types";
import { Locale, UI } from "@/lib/i18n/copy";
import {
  LOCALE_STORAGE_KEY,
  readLocaleFromDocumentCookie,
  writeLocalePreference,
} from "@/data/content/locale";
import {
  addressCapturedNote,
  addressConfirmAsk,
  parseCanadianAddress,
} from "@/lib/valuation/parse-address";
import {
  matchSelectOption,
  normalizeNumericAnswer,
  normalizeYesNoFreeText,
  parseAreaMeasure,
} from "@/lib/valuation/parse-measure";
import {
  applyDescribeEnrichment,
  shouldAttemptMultiExtract,
  toExtractableStep,
} from "@/lib/conversation/extract-answers";
import { ProgressRail } from "./ProgressRail";
import { InsightRail } from "./InsightRail";
import { StepInput } from "./StepInput";
import { ValuationPanel } from "./ValuationPanel";
import { BuyerResultPanel } from "./BuyerResultPanel";
import Link from "next/link";

function resolveStepAsk(
  s: ConversationStep,
  a: Answers,
  loc: Locale
): string {
  if (s.id === "addressConfirm" && a._suggestCity) {
    return addressConfirmAsk(
      a._suggestCity,
      a._suggestPostal || undefined,
      loc
    );
  }
  return s.ask;
}

/** Client-only: localStorage first, then cookie. Never call during SSR render. */
function readPreferredLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "fr") return stored;
  } catch {
    /* private mode */
  }
  const fromCookie = readLocaleFromDocumentCookie();
  if (fromCookie) return fromCookie;
  return "fr";
}

interface ConversationPatchResponse {
  ok: boolean;
  leadType?: "seller" | "buyer";
  propertyId?: string | null;
  homeownerId?: string | null;
  valuation?: ValuationRecord | null;
  valuationError?: string | null;
}

function now() {
  return new Date().toISOString();
}

async function patchConversation(
  conversationId: string,
  body: {
    appendTranscript?: TranscriptMessage[];
    answers?: Answers;
    complete?: boolean;
    leadType?: "seller" | "buyer";
    locale?: Locale;
  }
) {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save progress");
  return res.json() as Promise<ConversationPatchResponse>;
}

type Phase = "gate" | "inputMode" | "describe" | "flow";
type InputMode = "describe" | "guided";

export function ConversationFlow({
  initialLocale = "fr",
}: {
  /** From server cookie — must match SSR to avoid hydration mismatch (#425). */
  initialLocale?: Locale;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [history, setHistory] = useState<TranscriptMessage[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [valuation, setValuation] = useState<ValuationRecord | null>(null);
  const [valuationError, setValuationError] = useState<string | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [homeownerId, setHomeownerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Stable default for SSR + first client paint (never read localStorage here).
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const localeLockedByUser = useRef(false);
  const [leadType, setLeadType] = useState<"seller" | "buyer" | null>(null);
  const [phase, setPhase] = useState<Phase>("gate");
  const [inputMode, setInputMode] = useState<InputMode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // After mount, adopt stored client preference — never override an explicit user pick
  // (ref can reset on Strict Mode remount, so also persist a short-lived lock).
  useEffect(() => {
    try {
      if (sessionStorage.getItem("estate-valora-locale-picked") === "1") {
        localeLockedByUser.current = true;
        setLocale(readPreferredLocale());
        return;
      }
    } catch {
      /* private mode */
    }
    if (localeLockedByUser.current) return;
    const preferred = readPreferredLocale();
    if (preferred !== initialLocale) {
      setLocale(preferred);
    }
  }, [initialLocale]);

  function selectLocale(next: Locale) {
    localeLockedByUser.current = true;
    try {
      sessionStorage.setItem("estate-valora-locale-picked", "1");
    } catch {
      /* private mode */
    }
    writeLocalePreference(next);
    setLocale(next);
  }

  const copy = UI[locale];

  const steps = useMemo(() => {
    if (leadType === "buyer") return visibleBuyerSteps(answers, locale);
    if (leadType === "seller") return visibleSellerSteps(answers, locale);
    return [];
  }, [answers, leadType, locale]);

  function displayAnswer(step: ConversationStep, rawValue: string): string {
    if (!rawValue) return copy.skipped;
    if (step.type === "yesno") {
      if (rawValue === "Yes" || rawValue === "Oui") return copy.yes;
      if (rawValue === "No" || rawValue === "Non") return copy.no;
      return rawValue;
    }
    if (step.options?.length) {
      const labels = step.optionLabels || step.options;
      const mapOne = (v: string) => {
        const idx = step.options!.indexOf(v.trim());
        return idx >= 0 ? labels[idx] ?? v : v;
      };
      if (step.type === "multiselect" && rawValue.includes(",")) {
        return rawValue
          .split(",")
          .map((p) => mapOne(p.trim()))
          .filter(Boolean)
          .join(", ");
      }
      return mapOne(rawValue);
    }
    return rawValue;
  }

  function fieldLabel(key: string): string {
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

  /** Show stored English option values as locale labels in the summary record. */
  function displayStoredValue(key: string, value: string): string {
    if (!value) return "—";
    if (value === "Skipped") return copy.skipped;
    if (value === "Yes" || value === "Oui") return copy.yes;
    if (value === "No" || value === "Non") return copy.no;
    if (leadType === "seller" && locale === "fr") {
      const step = getSellerSteps("fr").find((s) => s.id === key);
      if (step?.options?.length) {
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
        if (idx >= 0) return labels[idx] ?? value;
      }
    }
    return value;
  }

  const step = steps[stepIndex];
  const railSections =
    leadType === "buyer" ? BUYER_SECTIONS : SECTIONS;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, started, finished, valuationLoading, phase]);

  async function begin() {
    setSaveError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, leadType: "seller" }),
      });
      if (!res.ok) throw new Error("Could not start conversation");
      const { conversation } = await res.json();
      setConversationId(conversation.id);
    } catch {
      setSaveError(copy.connectError);
      return;
    }

    setStarted(true);
    setPhase("gate");
    setAnswers({ locale });

    const intro: TranscriptMessage = {
      from: "ai",
      text: copy.startBody,
      at: now(),
    };
    const askIntent: TranscriptMessage = {
      from: "ai",
      text: copy.sellOrBuyAsk,
      stepId: "intent",
      at: now(),
    };
    setHistory([intro, askIntent]);
  }

  async function submitIntent(raw: "sell" | "buy") {
    if (submitting) return;
    setSubmitting(true);

    const display = raw === "buy" ? copy.buy : copy.sell;
    const userMsg: TranscriptMessage = {
      from: "user",
      text: display,
      stepId: "intent",
      at: now(),
    };

    const nextLead: "seller" | "buyer" = raw === "buy" ? "buyer" : "seller";
    const nextAnswers: Answers = {
      ...answers,
      locale,
      intent: raw,
    };
    setAnswers(nextAnswers);
    setLeadType(nextLead);
    setInputMode(null);
    setHistory((h) => [...h, userMsg]);

    const branchIntro =
      nextLead === "buyer" ? copy.buyerIntro : copy.sellerIntro;

    const followUp: TranscriptMessage[] = [
      { from: "ai", text: branchIntro, at: now() },
      {
        from: "ai-note",
        text: copy.inputModeHint,
        at: now(),
      },
      {
        from: "ai",
        text: copy.inputModeAsk,
        stepId: "inputMode",
        at: now(),
      },
    ];

    try {
      if (conversationId) {
        await patchConversation(conversationId, {
          appendTranscript: [userMsg, ...followUp],
          answers: { locale, intent: raw },
          leadType: nextLead,
          locale,
        });
      }
      setSaveError(null);
    } catch {
      setSaveError(copy.saveError);
    }

    setHistory((h) => [...h, ...followUp]);
    setPhase("inputMode");
    setStepIndex(0);
    setSubmitting(false);
  }

  async function submitInputMode(mode: InputMode) {
    if (submitting || phase !== "inputMode" || !leadType) return;
    setSubmitting(true);

    const display =
      mode === "describe" ? copy.inputModeDescribe : copy.inputModeGuided;
    const userMsg: TranscriptMessage = {
      from: "user",
      text: display,
      stepId: "inputMode",
      at: now(),
    };

    const nextAnswers: Answers = {
      ...answers,
      locale,
      intent: leadType === "buyer" ? "buy" : "sell",
      inputMode: mode,
    };
    setAnswers(nextAnswers);
    setInputMode(mode);
    setHistory((h) => [...h, userMsg]);

    const followUp: TranscriptMessage[] = [];

    if (mode === "describe") {
      followUp.push({
        from: "ai",
        text:
          leadType === "buyer" ? copy.describeAskBuyer : copy.describeAskSeller,
        stepId: "propertyNarrative",
        at: now(),
      });
    } else {
      const firstSteps =
        leadType === "buyer"
          ? visibleBuyerSteps(nextAnswers, locale)
          : visibleSellerSteps(nextAnswers, locale);
      const first = firstSteps[0];
      followUp.push({
        from: "ai-note",
        text: copy.guidedHint,
        at: now(),
      });
      followUp.push({
        from: "ai",
        text: first.ask,
        stepId: first.id,
        at: now(),
      });
      if (first.explain) {
        followUp.push({
          from: "ai-note",
          text: first.explain,
          stepId: first.id,
          at: now(),
        });
      }
    }

    try {
      if (conversationId) {
        await patchConversation(conversationId, {
          appendTranscript: [userMsg, ...followUp],
          answers: { locale, intent: nextAnswers.intent, inputMode: mode },
          leadType,
          locale,
        });
      }
      setSaveError(null);
    } catch {
      setSaveError(copy.saveError);
    }

    setHistory((h) => [...h, ...followUp]);
    setPhase(mode === "describe" ? "describe" : "flow");
    setStepIndex(0);
    setSubmitting(false);
  }

  async function submitDescribe(rawValue: string) {
    if (submitting || phase !== "describe" || !leadType) return;
    const narrative = rawValue.trim();
    if (!narrative) return;

    setSubmitting(true);

    const userMsg: TranscriptMessage = {
      from: "user",
      text: narrative,
      stepId: "propertyNarrative",
      at: now(),
    };
    setHistory((h) => [...h, userMsg]);

    let nextAnswers: Answers = {
      ...answers,
      locale,
      intent: leadType === "buyer" ? "buy" : "sell",
      inputMode: "describe",
      propertyNarrative: narrative,
    };

    const followUp: TranscriptMessage[] = [];

    // Seller: parse address cues from the paragraph before LLM extract
    if (leadType === "seller") {
      const parsed = parseCanadianAddress(narrative);
      if (parsed.street) nextAnswers.streetAddress = parsed.street;
      if (parsed.city) nextAnswers.city = parsed.city;
      if (parsed.postalCode) nextAnswers.postalCode = parsed.postalCode;
      if (parsed.complete && parsed.city) {
        followUp.push({
          from: "ai-note",
          text: addressCapturedNote(parsed.city, parsed.postalCode, locale),
          stepId: "streetAddress",
          at: now(),
        });
      }
    }

    try {
      const openSteps =
        leadType === "buyer"
          ? visibleBuyerSteps(nextAnswers, locale)
          : visibleSellerSteps(nextAnswers, locale);
      const extractRes = await fetch("/api/conversations/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: narrative,
          locale,
          openSteps: openSteps.map(toExtractableStep),
          alreadyAnswered: nextAnswers,
          limit: 45,
        }),
      });
      if (extractRes.ok) {
        const data = await extractRes.json();
        const extracted = (data.extracted || {}) as Answers;
        for (const [k, v] of Object.entries(extracted)) {
          if (!v || k.startsWith("_")) continue;
          if (nextAnswers[k]) continue;
          nextAnswers[k] = v;
        }
        if (extracted.livingAreaUnit && !nextAnswers.livingAreaUnit) {
          nextAnswers.livingAreaUnit = extracted.livingAreaUnit;
        }
        if (typeof data.note === "string" && data.note) {
          followUp.push({
            from: "ai-note",
            text: data.note,
            stepId: "propertyNarrative",
            at: now(),
          });
        }
      }
    } catch {
      /* best-effort */
    }

    // Merge heuristics + describe defaults (skip optional fishing questions).
    // Two passes: first may set propertyType, second unlocks house-only fields.
    for (let pass = 0; pass < 2; pass++) {
      const openForEnrich =
        leadType === "buyer"
          ? visibleBuyerSteps(nextAnswers, locale)
          : visibleSellerSteps(nextAnswers, locale);
      nextAnswers = applyDescribeEnrichment(
        narrative,
        nextAnswers,
        openForEnrich.map(toExtractableStep)
      );
    }

    if (nextAnswers.livingArea && !nextAnswers.livingAreaUnit) {
      const again = parseAreaMeasure(
        `${nextAnswers.livingArea} ${narrative}`
      );
      if (again.unit) nextAnswers.livingAreaUnit = again.unit;
      if (again.value && /^\d+$/.test(nextAnswers.livingArea)) {
        /* keep numeric livingArea */
      }
    }

    // Count property fields captured (ignore meta / contact / skips)
    const meta = new Set([
      "locale",
      "intent",
      "inputMode",
      "propertyNarrative",
      "homeownerName",
      "homeownerEmail",
      "homeownerPhone",
    ]);
    const capturedCount = Object.entries(nextAnswers).filter(
      ([k, v]) =>
        v &&
        v !== "Skipped" &&
        !k.startsWith("_") &&
        !meta.has(k)
    ).length;

    followUp.push({
      from: "ai",
      text: capturedCount >= 2 ? copy.describeReceived : copy.describeThin,
      at: now(),
    });

    setAnswers(nextAnswers);

    const nextSteps =
      leadType === "buyer"
        ? visibleBuyerSteps(nextAnswers, locale)
        : visibleSellerSteps(nextAnswers, locale);
    const nextIdx = nextSteps.findIndex((s) => {
      if (s.id === "addressConfirm") {
        return nextAnswers._needsAddressConfirm === "1" && !nextAnswers.city;
      }
      const v = nextAnswers[s.id];
      return v === undefined || v === "";
    });
    const isLast = nextIdx < 0;
    const next = isLast ? nextSteps.length : nextIdx;

    if (isLast) {
      followUp.push({
        from: "ai",
        text: leadType === "buyer" ? copy.buyerDone : copy.sellerDone,
        at: now(),
      });
    } else {
      const nq = nextSteps[next];
      followUp.push({
        from: "ai-note",
        text: copy.guidedHint,
        at: now(),
      });
      followUp.push({
        from: "ai",
        text: resolveStepAsk(nq, nextAnswers, locale),
        stepId: nq.id,
        at: now(),
      });
      if (nq.explain) {
        followUp.push({
          from: "ai-note",
          text: nq.explain,
          stepId: nq.id,
          at: now(),
        });
      }
    }

    const answerPatch: Answers = {
      locale,
      intent: nextAnswers.intent,
      inputMode: "describe",
      propertyNarrative: narrative,
    };
    for (const [k, v] of Object.entries(nextAnswers)) {
      if (answers[k] !== v) answerPatch[k] = v;
    }

    if (isLast && leadType === "seller") setValuationLoading(true);
    try {
      if (conversationId) {
        const result = await patchConversation(conversationId, {
          appendTranscript: [userMsg, ...followUp],
          answers: answerPatch,
          complete: isLast,
          leadType,
          locale,
        });
        if (isLast) {
          setPropertyId(result.propertyId ?? null);
          setHomeownerId(result.homeownerId ?? null);
          setValuation(result.valuation ?? null);
          setValuationError(result.valuationError ?? null);
        }
      }
      setSaveError(null);
    } catch {
      setSaveError(copy.saveError);
    } finally {
      if (isLast && leadType === "seller") setValuationLoading(false);
    }

    setHistory((h) => [...h, ...followUp]);
    if (isLast) {
      setFinished(true);
    } else {
      setPhase("flow");
      setStepIndex(next);
    }
    setSubmitting(false);
  }

  async function submitAnswer(rawValue: string) {
    if (!step || submitting || phase !== "flow" || !leadType) return;
    if (!rawValue && !step.optional) return;

    setSubmitting(true);

    const userMsg: TranscriptMessage = {
      from: "user",
      text: displayAnswer(step, rawValue),
      stepId: step.id,
      at: now(),
    };
    setHistory((h) => [...h, userMsg]);

    let nextAnswers: Answers = {
      ...answers,
      locale,
      intent: leadType === "buyer" ? "buy" : "sell",
    };

    const followUp: TranscriptMessage[] = [];
    const tryMulti = shouldAttemptMultiExtract(step, rawValue);

    /**
     * Item 4: normalize free-text (measures, yes/no, selects, numbers) so
     * "2000 m²" fills livingArea + livingAreaUnit and skips the unit question.
     */
    function applyFreeTextNormalization(target: Answers, raw: string) {
      if (step.id === "livingArea" || step.id === "lotSize") {
        const measure = parseAreaMeasure(raw);
        if (step.id === "livingArea") {
          target.livingArea = measure.value || raw.trim();
          if (measure.unit) target.livingAreaUnit = measure.unit;
        } else {
          // Keep natural lot size text; also stash unit if present for context
          target.lotSize = raw.trim();
          if (measure.unit && !target.livingAreaUnit && measure.value) {
            // lot size is free text — don't force livingAreaUnit
          }
        }
        return;
      }

      if (step.type === "number") {
        target[step.id] = normalizeNumericAnswer(raw) || raw.trim();
        return;
      }

      if (step.type === "yesno") {
        const yn = normalizeYesNoFreeText(raw);
        target[step.id] = yn || raw.trim();
        return;
      }

      if (step.type === "select") {
        const matched = matchSelectOption(
          raw,
          step.options,
          step.optionLabels
        );
        target[step.id] = matched || raw.trim();
        return;
      }

      if (step.type === "multiselect") {
        // Allow comma-separated free text; map each token to an option when possible
        const parts = raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length && step.options) {
          const mapped = parts.map(
            (p) =>
              matchSelectOption(p, step.options, step.optionLabels) || p
          );
          target[step.id] = [...new Set(mapped)].join(", ");
        } else {
          target[step.id] = raw.trim();
        }
      }
    }

    // ---- Seller: smart address capture (item 2) ----
    if (leadType === "seller" && step.id === "streetAddress") {
      const parsed = parseCanadianAddress(rawValue);
      nextAnswers.streetAddress = parsed.street || rawValue.trim();
      if (parsed.city) nextAnswers.city = parsed.city;
      if (parsed.postalCode) nextAnswers.postalCode = parsed.postalCode;
      nextAnswers._needsAddressConfirm = "";
      nextAnswers._suggestCity = "";
      nextAnswers._suggestPostal = "";

      if (parsed.complete && parsed.city) {
        followUp.push({
          from: "ai-note",
          text: addressCapturedNote(parsed.city, parsed.postalCode, locale),
          stepId: "streetAddress",
          at: now(),
        });
      } else if (!nextAnswers.city) {
        try {
          const geoRes = await fetch(
            `/api/geocode?q=${encodeURIComponent(
              parsed.street || rawValue.trim()
            )}`
          );
          const geo = await geoRes.json();
          if (geo?.ok && geo.suggestion?.city) {
            nextAnswers._suggestCity = geo.suggestion.city;
            nextAnswers._suggestPostal =
              geo.suggestion.postalCode || nextAnswers.postalCode || "";
            nextAnswers._needsAddressConfirm = "1";
          }
        } catch {
          /* continue without suggestion */
        }
      }
    } else if (leadType === "seller" && step.id === "addressConfirm") {
      const yes =
        rawValue === "Yes" ||
        rawValue === "Oui" ||
        rawValue.toLowerCase() === "yes";
      if (yes) {
        if (answers._suggestCity) nextAnswers.city = answers._suggestCity;
        if (answers._suggestPostal) {
          nextAnswers.postalCode = answers._suggestPostal;
        }
      }
      nextAnswers.addressConfirm = rawValue || "";
      nextAnswers._needsAddressConfirm = "";
    } else if (!tryMulti) {
      // Chip click or short answer — still normalize free-text when typed
      if (
        step.options?.includes(rawValue) ||
        rawValue === "Yes" ||
        rawValue === "No"
      ) {
        nextAnswers[step.id] = rawValue || "";
      } else {
        applyFreeTextNormalization(nextAnswers, rawValue);
        if (!nextAnswers[step.id]) nextAnswers[step.id] = rawValue || "";
      }
    } else {
      // Seed current field from free-text before multi-extract fills extras
      applyFreeTextNormalization(nextAnswers, rawValue);
    }

    // ---- Item 3: extract extra answers from one natural-language message ----
    if (tryMulti) {
      try {
        const openSteps =
          leadType === "buyer"
            ? visibleBuyerSteps(nextAnswers, locale)
            : visibleSellerSteps(nextAnswers, locale);
        const extractRes = await fetch("/api/conversations/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: rawValue,
            locale,
            openSteps: openSteps.map(toExtractableStep),
            alreadyAnswered: nextAnswers,
          }),
        });
        if (extractRes.ok) {
          const data = await extractRes.json();
          const extracted = (data.extracted || {}) as Answers;
          let extraCount = 0;
          for (const [k, v] of Object.entries(extracted)) {
            if (!v || k.startsWith("_")) continue;
            if (nextAnswers[k]) continue; // keep address / measure parse
            nextAnswers[k] = v;
            if (k !== step.id) extraCount += 1;
          }
          // If living area came with unit from extract, keep it
          if (
            extracted.livingAreaUnit &&
            !nextAnswers.livingAreaUnit &&
            nextAnswers.livingArea
          ) {
            nextAnswers.livingAreaUnit = extracted.livingAreaUnit;
          }
          if (extraCount > 0 && typeof data.note === "string" && data.note) {
            followUp.push({
              from: "ai-note",
              text: data.note,
              stepId: step.id,
              at: now(),
            });
          }
        }
      } catch {
        /* extraction is best-effort — continue the scripted flow */
      }
      if (!nextAnswers[step.id]) {
        nextAnswers[step.id] = rawValue || "";
      }
    }

    // Re-run measure parse if livingArea still has a unit embedded in the string
    if (nextAnswers.livingArea && !nextAnswers.livingAreaUnit) {
      const again = parseAreaMeasure(nextAnswers.livingArea);
      if (again.value) nextAnswers.livingArea = again.value;
      if (again.unit) nextAnswers.livingAreaUnit = again.unit;
    }

    setAnswers(nextAnswers);

    const nextSteps =
      leadType === "buyer"
        ? visibleBuyerSteps(nextAnswers, locale)
        : visibleSellerSteps(nextAnswers, locale);
    // Jump to the first still-unanswered visible step (skips city/postal when
    // already captured from a full address or confirm).
    const nextIdx = nextSteps.findIndex((s) => {
      if (s.id === "addressConfirm") {
        return (
          nextAnswers._needsAddressConfirm === "1" && !nextAnswers.city
        );
      }
      const v = nextAnswers[s.id];
      return v === undefined || v === "";
    });
    const isLast = nextIdx < 0;
    const next = isLast ? nextSteps.length : nextIdx;

    if (isLast) {
      followUp.push({
        from: "ai",
        text: leadType === "buyer" ? copy.buyerDone : copy.sellerDone,
        at: now(),
      });
    } else {
      const nq = nextSteps[next];
      followUp.push({
        from: "ai",
        text: resolveStepAsk(nq, nextAnswers, locale),
        stepId: nq.id,
        at: now(),
      });
      if (nq.explain) {
        followUp.push({
          from: "ai-note",
          text: nq.explain,
          stepId: nq.id,
          at: now(),
        });
      }
    }

    // Persist every field that changed this turn (city/postal may be filled early).
    const answerPatch: Answers = {
      locale,
      intent: nextAnswers.intent,
    };
    for (const [k, v] of Object.entries(nextAnswers)) {
      if (answers[k] !== v) answerPatch[k] = v;
    }

    if (isLast && leadType === "seller") setValuationLoading(true);
    try {
      if (conversationId) {
        const result = await patchConversation(conversationId, {
          appendTranscript: [userMsg, ...followUp],
          answers: answerPatch,
          complete: isLast,
          leadType,
          locale,
        });
        if (isLast) {
          setPropertyId(result.propertyId ?? null);
          setHomeownerId(result.homeownerId ?? null);
          setValuation(result.valuation ?? null);
          setValuationError(result.valuationError ?? null);
        }
      }
      setSaveError(null);
    } catch {
      setSaveError(copy.saveError);
    } finally {
      if (isLast && leadType === "seller") setValuationLoading(false);
    }

    setHistory((h) => [...h, ...followUp]);

    if (isLast) {
      setFinished(true);
    } else {
      setStepIndex(next);
    }
    setSubmitting(false);
  }

  const currentSection = finished
    ? "done"
    : phase === "gate" || phase === "inputMode"
      ? "Contact"
      : phase === "describe"
        ? "Property"
        : step
          ? step.section
          : "Property";

  const describeStep: ConversationStep = {
    id: "propertyNarrative",
    section: "Property",
    type: "text",
    ask:
      leadType === "buyer" ? copy.describeAskBuyer : copy.describeAskSeller,
    placeholder:
      leadType === "buyer"
        ? copy.describePlaceholderBuyer
        : copy.describePlaceholderSeller,
  };

  const progressLabel = finished
    ? leadType === "buyer"
      ? copy.progressBuyerDone
      : copy.progressSellerDone
    : started
      ? leadType === "buyer"
        ? copy.progressBuyer
        : leadType === "seller"
          ? copy.progressSeller
          : copy.progressReady
      : copy.progressReady;

  const intentStep = {
    id: "intent",
    section: "Contact" as const,
    type: "select" as const,
    ask: copy.sellOrBuyAsk,
    options: [copy.sell, copy.buy],
  };

  return (
    <div
      className="relative w-full h-[100dvh] bg-background overflow-hidden notranslate"
      translate="no"
      lang={locale === "fr" ? "fr-CA" : "en"}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 45% 60% at 0% 40%, rgba(183,172,127,0.07), transparent 55%),
            radial-gradient(ellipse 40% 50% at 100% 70%, rgba(44,156,197,0.05), transparent 50%),
            linear-gradient(180deg, #07090b 0%, #0a0d11 50%, #07090b 100%)
          `,
        }}
      />

      <div className="relative page-container h-full py-3 sm:py-4 md:py-6 flex gap-4 xl:gap-6 min-h-0 min-w-0">
        <ProgressRail
          currentSection={currentSection}
          progressLabel={progressLabel}
          sections={railSections}
          locale={locale}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0 h-full">
          <div className="flex-1 min-w-0 rounded-md border border-white/10 bg-surface/90 backdrop-blur-sm flex flex-col overflow-hidden min-h-0 h-full shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0 gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <Link
                  href="/"
                  className="lg:hidden w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"
                  aria-label="Estate Valora home"
                >
                  <Home size={14} className="text-background" />
                </Link>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground tracking-wide truncate">
                    Estate Valora
                  </p>
                  <p className="text-[12px] text-foreground-muted font-sans">
                    {finished
                      ? leadType === "buyer"
                        ? copy.progressBuyerDone
                        : copy.progressSellerDone
                      : started
                        ? leadType === "buyer"
                          ? copy.progressBuyer
                          : copy.progressSeller
                        : copy.progressReady}
                  </p>
                </div>
              </div>
              <ShieldCheck size={18} className="text-electric shrink-0" />
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-5 sm:py-6 font-sans"
            >
              {!started && (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-5 py-12 px-2">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-surface-soft border border-white/10 shadow-[0_0_40px_rgba(183,172,127,0.12)]">
                    <Home size={26} className="text-electric" />
                  </div>
                  <div className="max-w-lg">
                    <p className="text-[clamp(1.35rem,2.5vw,1.75rem)] font-semibold mb-2 text-foreground font-serif leading-snug">
                      {copy.startTitle}
                    </p>
                    <p className="text-[14px] text-foreground-muted leading-relaxed">
                      {copy.startBody}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
                        {copy.languageLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectLocale("en")}
                        className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                          locale === "en"
                            ? "border-electric/40 bg-electric/15 text-electric"
                            : "border-white/10 text-foreground-muted"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => selectLocale("fr")}
                        className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                          locale === "fr"
                            ? "border-electric/40 bg-electric/15 text-electric"
                            : "border-white/10 text-foreground-muted"
                        }`}
                      >
                        Français
                      </button>
                    </div>
                    <p className="text-[11px] text-foreground-subtle">
                      {copy.languageHint}
                    </p>
                  </div>

                  <button
                    onClick={begin}
                    className="mt-1 px-6 py-3 rounded-full bg-white text-background text-[14px] font-medium flex items-center gap-2 hover:bg-white/90 transition-colors"
                  >
                    {copy.startCta} <ArrowRight size={15} />
                  </button>
                  {saveError && (
                    <p className="text-[12px] text-warm">{saveError}</p>
                  )}
                </div>
              )}

              {started && (
                <div
                  className={`mx-auto w-full ${
                    finished ? "max-w-5xl" : "max-w-3xl"
                  }`}
                >
                  {history.map((m, i) =>
                    m.from === "ai-note" ? (
                      <div
                        key={i}
                        className="flex justify-start mb-3 -mt-1 min-w-0"
                      >
                        <div className="max-w-[min(95%,36rem)] min-w-0 rounded-md px-3.5 py-2 text-[13px] flex gap-2 bg-surface-soft border border-white/8 text-foreground-muted">
                          <Info
                            size={13}
                            className="shrink-0 mt-0.5 text-electric"
                          />
                          <span className="min-w-0 break-words">{m.text}</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={i}
                        className={`flex min-w-0 ${
                          m.from === "ai" ? "justify-start" : "justify-end"
                        } mb-3`}
                      >
                        <div
                          className={`max-w-[min(95%,36rem)] min-w-0 rounded-md px-3.5 sm:px-4 py-2.5 sm:py-3 text-[14px] sm:text-[15px] leading-relaxed break-words ${
                            m.from === "ai"
                              ? "rounded-tl-sm bg-surface-soft border border-white/10 text-foreground"
                              : "rounded-tr-sm bg-electric/20 border border-electric/30 text-foreground"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    )
                  )}

                  {finished && leadType === "seller" && (
                    <>
                      <ValuationPanel
                        loading={valuationLoading}
                        valuation={valuation}
                        valuationError={valuationError}
                        conversationId={conversationId}
                        propertyId={propertyId}
                        homeownerId={homeownerId}
                        locale={locale}
                      />
                      <div className="mt-5 rounded-md border border-white/10 bg-surface-soft p-4 sm:p-6 min-w-0 overflow-hidden">
                        <p className="text-[13px] font-semibold mb-4 text-foreground">
                          {copy.sellerRecordTitle}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 text-[13px] min-w-0">
                          {Object.entries(answers)
                            .filter(
                              ([k]) =>
                                k !== "locale" &&
                                k !== "intent" &&
                                k !== "inputMode" &&
                                k !== "addressConfirm" &&
                                !k.startsWith("_")
                            )
                            .map(([k, v]) => (
                              <div key={k} className="min-w-0">
                                <p className="text-[11px] text-foreground-subtle uppercase tracking-[0.08em] mb-0.5">
                                  {fieldLabel(k)}
                                </p>
                                <p className="text-foreground break-words [overflow-wrap:anywhere]">
                                  {displayStoredValue(k, v)}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  {finished && leadType === "buyer" && (
                    <BuyerResultPanel
                      answers={answers}
                      locale={locale}
                      conversationId={conversationId}
                      homeownerId={homeownerId}
                      doneMessage={copy.buyerDone}
                      panelTitle={copy.buyerPanelTitle}
                      panelNote={copy.buyerPanelNote}
                    />
                  )}

                  {saveError && (
                    <p className="text-[12px] text-warm mt-2 break-words">
                      {saveError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {started && !finished && phase === "gate" && (
              <div className="border-t border-white/10 p-3 sm:p-4 lg:px-8 font-sans shrink-0 bg-surface/95 min-w-0">
                <div className="mx-auto w-full max-w-3xl flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitIntent("sell")}
                    className="flex-1 px-4 py-3 rounded-md border border-white/10 bg-surface-soft text-[14px] text-foreground hover:border-electric/40 hover:bg-electric/10 disabled:opacity-50 transition-colors"
                  >
                    {copy.sell}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitIntent("buy")}
                    className="flex-1 px-4 py-3 rounded-md border border-white/10 bg-surface-soft text-[14px] text-foreground hover:border-electric/40 hover:bg-electric/10 disabled:opacity-50 transition-colors"
                  >
                    {copy.buy}
                  </button>
                </div>
              </div>
            )}

            {started && !finished && phase === "inputMode" && (
              <div className="border-t border-white/10 p-3 sm:p-4 lg:px-8 font-sans shrink-0 bg-surface/95 min-w-0">
                <div className="mx-auto w-full max-w-3xl flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitInputMode("describe")}
                    className="flex-1 px-4 py-3 rounded-md border border-electric/35 bg-electric/10 text-[14px] text-foreground hover:border-electric/55 hover:bg-electric/15 disabled:opacity-50 transition-colors text-left sm:text-center"
                  >
                    {copy.inputModeDescribe}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitInputMode("guided")}
                    className="flex-1 px-4 py-3 rounded-md border border-white/10 bg-surface-soft text-[14px] text-foreground hover:border-electric/40 hover:bg-electric/10 disabled:opacity-50 transition-colors text-left sm:text-center"
                  >
                    {copy.inputModeGuided}
                  </button>
                </div>
              </div>
            )}

            {started && !finished && phase === "describe" && (
              <div className="border-t border-white/10 p-3 sm:p-4 lg:px-8 font-sans shrink-0 bg-surface/95 min-w-0">
                <div className="mx-auto w-full max-w-3xl">
                  <StepInput
                    step={describeStep}
                    onSubmit={submitDescribe}
                    disabled={submitting}
                    locale={locale}
                    variant="paragraph"
                  />
                </div>
              </div>
            )}

            {started && !finished && phase === "flow" && step && (
              <div className="border-t border-white/10 p-3 sm:p-4 lg:px-8 font-sans shrink-0 bg-surface/95 min-w-0">
                <div className="mx-auto w-full max-w-3xl">
                  <StepInput
                    step={step}
                    onSubmit={submitAnswer}
                    disabled={submitting}
                    locale={locale}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <InsightRail
          started={started}
          finished={finished}
          answers={answers}
          currentAsk={
            phase === "gate"
              ? intentStep.ask
              : phase === "inputMode"
                ? copy.inputModeAsk
                : phase === "describe"
                  ? describeStep.ask
                  : step
                    ? resolveStepAsk(step, answers, locale)
                    : undefined
          }
          locale={locale}
        />
      </div>
    </div>
  );
}
