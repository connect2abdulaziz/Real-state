"use client";

import { useEffect, useState } from "react";
import { ConversationStep } from "@/lib/types";

export function StepInput({
  step,
  onSubmit,
  disabled = false,
}: {
  step: ConversationStep;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setValue("");
    setSelected([]);
  }, [step.id]);

  if (step.type === "select") {
    return (
      <div className="flex flex-wrap gap-2">
        {step.options?.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(opt)}
            className="px-3.5 py-2 rounded-full border border-white/15 text-foreground text-[13px] bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (step.type === "multiselect") {
    function toggle(opt: string) {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {step.options?.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => toggle(opt)}
                className={`px-3.5 py-2 rounded-full border text-[13px] transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                  active
                    ? "border-electric bg-electric/15 text-foreground font-medium"
                    : "border-white/15 text-foreground bg-white/[0.04] hover:bg-white/[0.1]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled || selected.length === 0}
            onClick={() => onSubmit(selected.join(", "))}
            className="px-4 py-2.5 rounded-full bg-white text-background text-[13px] font-medium disabled:opacity-50 disabled:pointer-events-none"
          >
            Continue
          </button>
          {step.optional && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSubmit("")}
              className="px-4 py-2.5 rounded-full border border-white/15 text-foreground-muted text-[13px] disabled:opacity-50"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step.type === "yesno") {
    return (
      <div className="flex gap-2">
        {["Yes", "No"].map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(opt)}
            className="px-5 py-2 rounded-full border border-white/15 text-foreground text-[13px] font-medium bg-white/[0.04] hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit(value.trim());
      }}
      className="flex gap-2 min-w-0 w-full"
    >
      <input
        autoFocus
        disabled={disabled}
        type={step.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={step.placeholder}
        className="flex-1 min-w-0 rounded-full border border-white/15 bg-white/[0.04] px-3.5 sm:px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-subtle focus:border-electric/60 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="px-3.5 sm:px-4 py-2.5 rounded-full bg-white text-background text-[13px] font-medium shrink-0 disabled:opacity-50 disabled:pointer-events-none"
      >
        {step.optional && !value ? "Skip" : "Send"}
      </button>
    </form>
  );
}
