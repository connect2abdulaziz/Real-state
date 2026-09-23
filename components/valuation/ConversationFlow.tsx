"use client";

import { useEffect, useRef, useState } from "react";
import { Home, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { STEPS, visibleSteps, FIELD_LABELS } from "@/lib/valuation/steps";
import { Answers, TranscriptMessage, ValuationRecord } from "@/lib/types";

interface ConversationPatchResponse {
  ok: boolean;
  propertyId?: string;
  homeownerId?: string | null;
  valuation?: ValuationRecord | null;
  valuationError?: string | null;
}
import { ProgressRail } from "./ProgressRail";
import { InsightRail } from "./InsightRail";
import { StepInput } from "./StepInput";
import { ValuationPanel } from "./ValuationPanel";
import { SmokeTestButton } from "./SmokeTestButton";
import Link from "next/link";

function now() {
  return new Date().toISOString();
}

async function patchConversation(
  conversationId: string,
  body: {
    appendTranscript?: TranscriptMessage[];
    answers?: Answers;
    complete?: boolean;
  }
) {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("Failed to save progress");
  }
  return res.json() as Promise<ConversationPatchResponse>;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const steps = visibleSteps(answers);
  const step = steps[stepIndex];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, started, finished, valuationLoading]);

  async function begin() {
    setSaveError(null);
    try {
      const res = await fetch("/api/conversations", { method: "POST" });
      if (!res.ok) throw new Error("Could not start conversation");
      const { conversation } = await res.json();
      setConversationId(conversation.id);
    } catch (err) {
      setSaveError(
        "Couldn't connect to start your valuation. Please try again."
      );
      return;
    }

    setStarted(true);
    const intro: TranscriptMessage = {
      from: "ai",
      text: "Hi — I'm EstateValora. I'll ask a few questions one at a time about your property to prepare a preliminary valuation. No long form — just a short conversation, usually about three to five minutes.",
      at: now(),
    };
    const firstQ: TranscriptMessage = {
      from: "ai",
      text: STEPS[0].ask,
      stepId: STEPS[0].id,
      at: now(),
    };
    const firstNote: TranscriptMessage[] = STEPS[0].explain
      ? [{ from: "ai-note", text: STEPS[0].explain, stepId: STEPS[0].id, at: now() }]
      : [];

    setHistory([intro, firstQ, ...firstNote]);
  }

  async function submitAnswer(rawValue: string) {
    if (!step || submitting) return;
    if (!rawValue && !step.optional) return;

    setSubmitting(true);

    const displayValue = rawValue || "Skipped";
    const userMsg: TranscriptMessage = {
      from: "user",
      text: displayValue,
      stepId: step.id,
      at: now(),
    };
    setHistory((h) => [...h, userMsg]);

    const nextAnswers: Answers = { ...answers, [step.id]: rawValue || "" };
    setAnswers(nextAnswers);

    const nextSteps = visibleSteps(nextAnswers);
    const currentPos = nextSteps.findIndex((s) => s.id === step.id);
    const next = currentPos + 1;
    const isLast = next >= nextSteps.length;

    // Follow-up messages only (userMsg is already in local history).
    const followUp: TranscriptMessage[] = [];

    if (isLast) {
      followUp.push({
        from: "ai",
        text: "Thank you. I have everything I need to prepare your preliminary valuation. I'm analyzing the information you've provided to estimate a current market value range for your property.",
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

    const appendTranscript: TranscriptMessage[] = [userMsg, ...followUp];

    // Persist to Supabase via the API route before updating local UI state,
    // so the conversation record never drifts from what's shown on screen.
    if (isLast) setValuationLoading(true);
    try {
      if (conversationId) {
        const result = await patchConversation(conversationId, {
          appendTranscript,
          answers: { [step.id]: rawValue || "" },
          complete: isLast,
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
      setSaveError(
        "Your last answer was recorded here, but couldn't be saved — check your connection."
      );
    } finally {
      if (isLast) setValuationLoading(false);
    }

    setHistory((h) => [...h, ...followUp]);

    if (isLast) {
      setFinished(true);
    } else {
      setStepIndex(next);
    }
    setSubmitting(false);
  }

  const currentSection = finished ? "done" : step ? step.section : "Property";
  const progressLabel = finished
    ? "Valuation complete"
    : started && step
    ? `Current: ${step.section}`
    : "Ready when you are";

  return (
    <div className="relative w-full h-[100dvh] bg-background overflow-hidden">
      {/* Atmospheric side glow — fills empty flanks */}
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
        />

        {/* Center stage */}
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
                      ? "Your preliminary estimate"
                      : started
                      ? "AI property valuation"
                      : "Ready to begin"}
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
                      What&apos;s your property worth?
                    </p>
                    <p className="text-[14px] text-foreground-muted leading-relaxed">
                      A short, adaptive conversation — not a long form — that
                      collects what we need for a preliminary Estate Valora
                      estimate.
                    </p>
                  </div>
                  <button
                    onClick={begin}
                    className="mt-1 px-6 py-3 rounded-full bg-white text-background text-[14px] font-medium flex items-center gap-2 hover:bg-white/90 transition-colors"
                  >
                    Start valuation <ArrowRight size={15} />
                  </button>
                  {saveError && (
                    <p className="text-[12px] text-warm">{saveError}</p>
                  )}
                  <SmokeTestButton />
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

                  {finished && (
                    <>
                      <ValuationPanel
                        loading={valuationLoading}
                        valuation={valuation}
                        valuationError={valuationError}
                        conversationId={conversationId}
                        propertyId={propertyId}
                        homeownerId={homeownerId}
                      />

                      <div className="mt-5 rounded-md border border-white/10 bg-surface-soft p-4 sm:p-6 min-w-0 overflow-hidden">
                        <p className="text-[13px] font-semibold mb-4 text-foreground">
                          Structured property record
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 text-[13px] min-w-0">
                          {Object.entries(answers).map(([k, v]) => (
                            <div key={k} className="min-w-0">
                              <p className="text-[11px] text-foreground-subtle uppercase tracking-[0.08em] mb-0.5">
                                {FIELD_LABELS[k] || k}
                              </p>
                              <p className="text-foreground break-words [overflow-wrap:anywhere]">
                                {v || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 pt-4 border-t border-white/10 text-[12px] leading-relaxed text-foreground-muted">
                          This record has been saved and is what Phase 1 passed
                          to the OpenAI valuation step above.
                        </div>
                      </div>
                    </>
                  )}

                  {saveError && (
                    <p className="text-[12px] text-warm mt-2 break-words">
                      {saveError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {started && !finished && step && (
              <div className="border-t border-white/10 p-3 sm:p-4 lg:px-8 font-sans shrink-0 bg-surface/95 min-w-0">
                <div className="mx-auto w-full max-w-3xl">
                  <StepInput
                    step={step}
                    onSubmit={submitAnswer}
                    disabled={submitting}
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
          currentAsk={step?.ask}
        />
      </div>
    </div>
  );
}
