"use client";

import Link from "next/link";
import { Home, Check, Info, Sparkles } from "lucide-react";
import { SECTIONS } from "@/lib/valuation/steps";

export function ProgressRail({
  currentSection,
  progressLabel,
}: {
  currentSection: string;
  progressLabel?: string;
}) {
  const sections: readonly string[] = SECTIONS;
  const currentIdx = sections.indexOf(currentSection);
  const doneCount =
    currentSection === "done" ? sections.length : Math.max(0, currentIdx);
  const pct = Math.round((doneCount / sections.length) * 100);

  return (
    <aside className="hidden lg:flex flex-col w-[280px] xl:w-[300px] shrink-0 h-full min-h-0">
      <div className="rounded-md border border-white/10 bg-surface/80 backdrop-blur-sm p-5 flex flex-col h-full min-h-0 overflow-y-auto">
        <Link href="/" className="flex items-center gap-3 mb-6 group">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white shrink-0">
            <Home size={16} className="text-background" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-[0.14em] uppercase text-foreground group-hover:text-electric transition-colors">
              Estate Valora
            </p>
            <p className="text-[12px] text-foreground-muted">
              Property Insight Montreal
            </p>
          </div>
        </Link>

        <div className="mb-6">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-foreground-subtle mb-2">
            <span>Progress</span>
            <span className="text-electric">{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-electric transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progressLabel && (
            <p className="mt-2 text-[12px] text-foreground-muted">{progressLabel}</p>
          )}
        </div>

        <nav className="flex flex-col gap-1 flex-1" aria-label="Valuation stages">
          {sections.map((s, i) => {
            const isDone = currentSection === "done" || i < currentIdx;
            const isCurrent = s === currentSection;
            return (
              <div
                key={s}
                className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors ${
                  isCurrent ? "bg-white/[0.06]" : ""
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    isDone
                      ? "border-electric bg-electric"
                      : isCurrent
                      ? "border-electric bg-transparent"
                      : "border-white/15 bg-transparent"
                  }`}
                >
                  {isDone && <Check size={11} className="text-background" />}
                  {isCurrent && !isDone && (
                    <span className="w-1.5 h-1.5 rounded-full bg-electric" />
                  )}
                </div>
                <span
                  className={`text-[13px] ${
                    isCurrent
                      ? "text-foreground font-semibold"
                      : isDone
                      ? "text-foreground-muted"
                      : "text-foreground-subtle"
                  }`}
                >
                  {s}
                </span>
              </div>
            );
          })}
        </nav>

        <div className="mt-6 rounded-md p-3.5 flex gap-2.5 bg-surface-soft border border-white/8">
          <Info size={15} className="text-electric shrink-0 mt-0.5" />
          <p className="text-[12px] leading-snug text-foreground-muted">
            Preliminary AI-assisted estimate — not a certified appraisal.
            Subject to review by Ashkan Shamloo.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-foreground-subtle">
          <Sparkles size={12} className="text-electric" />
          Clarity before you decide
        </div>
      </div>
    </aside>
  );
}
