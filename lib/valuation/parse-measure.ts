/**
 * Parse free-text measurements so users can type "2000 m²" instead of
 * answering a number step and a separate unit step.
 */

export type AreaUnit = "Square feet" | "Square metres";

export type ParsedMeasure = {
  /** Numeric magnitude as a string of digits (no commas). */
  value?: string;
  unit?: AreaUnit;
  /** Original trimmed input (useful for lotSize free text). */
  raw: string;
};

const METRIC_RE =
  /(?:m²|m2|m\^2|metres?\s*carrés?|mètres?\s*carrés?|sq\.?\s*m(?:etres?)?|square\s*metres?)/i;
const IMPERIAL_RE =
  /(?:sq\.?\s*ft|sqft|ft²|ft2|pi(?:eds?)?\s*²|pi2|square\s*feet|pieds?\s*carrés?)/i;

function extractNumber(input: string): string | undefined {
  const m = input.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : undefined;
}

/** Detect area value + unit from natural language. */
export function parseAreaMeasure(input: string): ParsedMeasure {
  const raw = input.replace(/\s+/g, " ").trim();
  if (!raw) return { raw: "" };

  const value = extractNumber(raw);
  let unit: AreaUnit | undefined;
  if (METRIC_RE.test(raw)) unit = "Square metres";
  else if (IMPERIAL_RE.test(raw)) unit = "Square feet";

  return { value, unit, raw };
}

/**
 * Normalize a typed answer for a numeric step: keep digits when present,
 * otherwise keep the raw string so free text is never rejected.
 */
export function normalizeNumericAnswer(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const n = extractNumber(raw);
  return n ?? raw;
}

/** Map free-text onto a select option (EN values or FR labels). */
export function matchSelectOption(
  input: string,
  options?: string[],
  optionLabels?: string[]
): string | null {
  if (!options?.length) return null;
  const v = input.trim().toLowerCase();
  if (!v) return null;

  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;

  if (optionLabels) {
    const idx = optionLabels.findIndex((l) => l.toLowerCase() === v);
    if (idx >= 0) return options[idx];
  }

  const partial = options.find(
    (o) => v.includes(o.toLowerCase()) || o.toLowerCase().includes(v)
  );
  if (partial) return partial;

  if (optionLabels) {
    const idx = optionLabels.findIndex(
      (l) => v.includes(l.toLowerCase()) || l.toLowerCase().includes(v)
    );
    if (idx >= 0) return options[idx];
  }

  return null;
}

export function normalizeYesNoFreeText(input: string): "Yes" | "No" | null {
  const t = input.trim().toLowerCase();
  if (!t) return null;
  if (/^(yes|y|oui|ouais|true|1)\b/.test(t)) return "Yes";
  if (/^(no|n|non|false|0)\b/.test(t)) return "No";
  if (/\byes\b|\boui\b/.test(t) && !/\bno\b|\bnon\b/.test(t)) return "Yes";
  if (/\bno\b|\bnon\b/.test(t)) return "No";
  return null;
}
