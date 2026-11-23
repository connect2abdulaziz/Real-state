import type { Answers } from "@/lib/types";
import type { PropertyFacts } from "@/lib/valuation/fetch-property-facts";

const FILLABLE: Array<keyof PropertyFacts | "municipalAssessment"> = [
  "propertyType",
  "yearBuilt",
  "livingArea",
  "livingAreaUnit",
  "lotSize",
  "municipalAssessment",
  "numberOfFloors",
];

function isEmpty(answers: Answers, key: string): boolean {
  const v = answers[key];
  return v === undefined || v === null || String(v).trim() === "";
}

/**
 * Prefill empty conversation answers from public lookup facts.
 * Never overwrites customer-provided values.
 */
export function applyPropertyFactsToAnswers(
  answers: Answers,
  facts: PropertyFacts | null | undefined
): { answers: Answers; filledIds: string[] } {
  if (!facts) {
    return { answers, filledIds: [] };
  }

  const next: Answers = { ...answers };
  const filledIds: string[] = [];

  const tryFill = (key: string, value: string | undefined) => {
    if (!value) return;
    if (!isEmpty(next, key)) return;
    next[key] = value;
    filledIds.push(key);
  };

  tryFill("propertyType", facts.propertyType);
  tryFill("yearBuilt", facts.yearBuilt);
  tryFill("livingArea", facts.livingArea);
  tryFill("livingAreaUnit", facts.livingAreaUnit);
  tryFill("lotSize", facts.lotSize);
  tryFill("municipalAssessment", facts.municipalAssessment);
  tryFill("numberOfFloors", facts.numberOfFloors);

  // Always stamp lookup time so ConversationFlow only calls once per thread
  next._retrievedAt = new Date().toISOString();
  if (facts.confidence) next._retrievedConfidence = facts.confidence;
  if (facts.notes) next._retrievedNotes = facts.notes;

  if (filledIds.length > 0) {
    const prev = (next._retrievedFields || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...prev, ...filledIds])];
    next._retrievedFields = merged.join(",");
  }

  return { answers: next, filledIds };
}

export function retrievedFieldSet(answers: Answers): Set<string> {
  return new Set(
    (answers._retrievedFields || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function formatRetrievedNote(args: {
  locale: "en" | "fr";
  filledIds: string[];
  labels: Record<string, string>;
  template: string;
  emptyTemplate: string;
}): string {
  if (args.filledIds.length === 0) return args.emptyTemplate;
  const list = args.filledIds
    .filter((id) => id !== "livingAreaUnit")
    .map((id) => args.labels[id] || id)
    .join(args.locale === "fr" ? ", " : ", ");
  return args.template.replace("{fields}", list);
}

/** Exported for tests / UI — known fillable fact keys. */
export const PROPERTY_FACT_FILLABLE_KEYS = FILLABLE;
