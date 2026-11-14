"use client";

import { useEffect, useState } from "react";
import { ConversationStep } from "@/lib/types";
import type { Locale } from "@/lib/i18n/copy";
import { UI } from "@/lib/i18n/copy";

/**
 * Chips + text are equal choices on guided steps.
 * `variant="paragraph"` is the ChatGPT-style open description composer.
 */
export function StepInput({
  step,
  onSubmit,
  disabled = false,
  locale = "en",
  variant = "default",
}: {
  step: ConversationStep;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  locale?: Locale;
  variant?: "default" | "paragraph";
}) {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const copy = UI[locale];

  useEffect(() => {
    setValue("");
    setSelected([]);
  }, [step.id, variant]);

  const labels = step.optionLabels || step.options;
  const hasChips =
    variant === "default" &&
    (step.type === "select" ||
      step.type === "yesno" ||
      step.type === "multiselect");

  if (variant === "paragraph") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          const trimmed = value.trim();
          if (!trimmed) return;
          onSubmit(trimmed);
        }}
        className="flex flex-col gap-3 min-w-0 w-full"
      >
        <textarea
          autoFocus
          disabled={disabled}
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={step.placeholder || copy.orTypeOwn}
          className="w-full min-h-[9rem] resize-y rounded-md border border-white/15 bg-white/[0.04] px-3.5 sm:px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed text-foreground outline-none placeholder:text-foreground-subtle focus:border-electric/60 disabled:opacity-50"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="px-4 sm:px-5 py-2.5 rounded-full bg-white text-background text-[13px] font-medium shrink-0 disabled:opacity-50 disabled:pointer-events-none"
          >
            {copy.send}
          </button>
        </div>
      </form>
    );
  }

  const placeholder =
    step.placeholder ||
    (step.type === "yesno"
      ? locale === "fr"
        ? "Oui / Non…"
        : "Yes / No…"
      : step.type === "select" || step.type === "multiselect"
        ? copy.orTypeOwn
        : locale === "fr"
          ? "Votre réponse…"
          : "Your answer…");

  function submitText() {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed && !step.optional) return;
    onSubmit(trimmed);
  }

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full">
      {step.type === "select" && (
        <div className="flex flex-wrap gap-2">
          {step.options?.map((opt, i) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onSubmit(opt)}
              className="px-3.5 py-2 rounded-full border border-white/15 text-foreground text-[13px] bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {labels?.[i] ?? opt}
            </button>
          ))}
        </div>
      )}

      {step.type === "yesno" && (
        <div className="flex flex-wrap gap-2">
          {[
            { value: "Yes", label: copy.yes },
            { value: "No", label: copy.no },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onSubmit(opt.value)}
              className="px-5 py-2 rounded-full border border-white/15 text-foreground text-[13px] font-medium bg-white/[0.04] hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {step.type === "multiselect" && (
        <div className="flex flex-wrap gap-2">
          {step.options?.map((opt, i) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(opt)
                      ? prev.filter((o) => o !== opt)
                      : [...prev, opt]
                  )
                }
                className={`px-3.5 py-2 rounded-full border text-[13px] transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                  active
                    ? "border-electric bg-electric/15 text-foreground font-medium"
                    : "border-white/15 text-foreground bg-white/[0.04] hover:bg-white/[0.1]"
                }`}
              >
                {labels?.[i] ?? opt}
              </button>
            );
          })}
        </div>
      )}

      {hasChips && (
        <p className="text-[11px] text-foreground-subtle -mt-1">
          {copy.pickOrType}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step.type === "multiselect" && selected.length > 0 && !value.trim()) {
            if (disabled) return;
            onSubmit(selected.join(", "));
            return;
          }
          submitText();
        }}
        className="flex gap-2 min-w-0 w-full"
      >
        <input
          autoFocus={!hasChips}
          disabled={disabled}
          type="text"
          inputMode={step.type === "number" ? "decimal" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 rounded-full border border-white/15 bg-white/[0.04] px-3.5 sm:px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-subtle focus:border-electric/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={
            disabled ||
            (!value.trim() &&
              !(
                step.optional ||
                (step.type === "multiselect" && selected.length > 0)
              ))
          }
          className="px-3.5 sm:px-4 py-2.5 rounded-full bg-white text-background text-[13px] font-medium shrink-0 disabled:opacity-50 disabled:pointer-events-none"
        >
          {step.optional && !value.trim() && selected.length === 0
            ? copy.skip
            : copy.send}
        </button>
      </form>

      {step.type === "multiselect" && step.optional && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit("")}
          className="self-start text-[12px] text-foreground-subtle hover:text-foreground-muted"
        >
          {copy.skip}
        </button>
      )}
    </div>
  );
}
