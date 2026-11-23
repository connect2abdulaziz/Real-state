import type { Answers, ConversationStep } from "@/lib/types";

/**
 * Whether a conversation field already has a usable value so we should
 * not ask it again. "Skipped" counts as answered (optional fishing done).
 */
export function isFieldAnswered(answers: Answers, stepId: string): boolean {
  if (stepId === "addressConfirm") {
    // Only still needed when geocode suggested a city and user hasn't set city yet.
    return !(answers._needsAddressConfirm === "1" && !answers.city);
  }
  const v = answers[stepId];
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  return s !== "";
}

/**
 * First visible step that still needs an answer, or -1 when complete.
 */
export function findNextUnansweredStepIndex(
  steps: ConversationStep[],
  answers: Answers
): number {
  return steps.findIndex((s) => !isFieldAnswered(answers, s.id));
}

export function findNextUnansweredStep(
  steps: ConversationStep[],
  answers: Answers
): ConversationStep | null {
  const idx = findNextUnansweredStepIndex(steps, answers);
  return idx < 0 ? null : steps[idx];
}
