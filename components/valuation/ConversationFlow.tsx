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
import { ProgressRail } from "./ProgressRail";
import { InsightRail } from "./InsightRail";
import { StepInput } from "./StepInput";
import { ValuationPanel } from "./ValuationPanel";
import { BuyerResultPanel } from "./BuyerResultPanel";
import Link from "next/link";

function readPreferredLocale(): Locale {
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

type Phase = "gate" | "flow";

export function ConversationFlow() {
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
  const [locale, setLocale] = useState<Locale>(() => readPreferredLocale());
  const [leadType, setLeadType] = useState<"seller" | "buyer" | null>(null);
  const [phase, setPhase] = useState<Phase>("gate");
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [history, started, finished, valuationLoading]);

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
    setHistory((h) => [...h, userMsg]);

    const branchIntro =
      nextLead === "buyer" ? copy.buyerIntro : copy.sellerIntro;
    const firstSteps =
      nextLead === "buyer"
        ? visibleBuyerSteps(nextAnswers, locale)
        : visibleSellerSteps(nextAnswers, locale);
    const first = firstSteps[0];

    const followUp: TranscriptMessage[] = [
      { from: "ai", text: branchIntro, at: now() },
      {
        from: "ai",
        text: first.ask,
        stepId: first.id,
        at: now(),
      },
    ];
    if (first.explain) {
      followUp.push({
        from: "ai-note",
        text: first.explain,
        stepId: first.id,
        at: now(),
      });
    }

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
    setPhase("flow");
    setStepIndex(0);
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

    const nextAnswers: Answers = {
      ...answers,
      [step.id]: rawValue || "",
      locale,
      intent: leadType === "buyer" ? "buy" : "sell",
    };
    setAnswers(nextAnswers);

    const nextSteps =
      leadType === "buyer"
        ? visibleBuyerSteps(nextAnswers, locale)
        : visibleSellerSteps(nextAnswers, locale);
    const currentPos = nextSteps.findIndex((s) => s.id === step.id);
    const next = currentPos + 1;
    const isLast = next >= nextSteps.length;

    const followUp: TranscriptMessage[] = [];

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
        text: nq.ask,
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

    if (isLast && leadType === "seller") setValuationLoading(true);
    try {
      if (conversationId) {
        const result = await patchConversation(conversationId, {
          appendTranscript: [userMsg, ...followUp],
          answers: { [step.id]: rawValue || "", locale, intent: nextAnswers.intent },
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
    : phase === "gate"
      ? "Contact"
      : step
        ? step.section
        : "Property";

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
    <div className="relative w-full h-[100dvh] bg-background overflow-hidden">
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
                        onClick={() => {
                          writeLocalePreference("en");
                          setLocale("en");
                        }}
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
                        onClick={() => {
                          writeLocalePreference("fr");
                          setLocale("fr");
                        }}
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
                              ([k]) => k !== "locale" && k !== "intent"
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
            phase === "gate" ? intentStep.ask : step?.ask
          }
          locale={locale}
        />
      </div>
    </div>
  );
}
