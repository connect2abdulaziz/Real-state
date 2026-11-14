import { z } from "zod";
import { createOpenAIClient } from "@/lib/openai/client";
import type { Answers, ConversationStep, StepType } from "@/lib/types";
import type { Locale } from "@/lib/i18n/copy";

export const EXTRACTION_MODEL =
  process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";

/** Serializable step descriptor sent to / received from the extract API. */
export type ExtractableStep = {
  id: string;
  type: StepType;
  ask: string;
  optional?: boolean;
  options?: string[];
  optionLabels?: string[];
};

const SKIP_IDS = new Set([
  "intent",
  "locale",
  "inputMode",
  "propertyNarrative",
  "addressConfirm",
]);

/** Optional detail fields we auto-skip after a full describe paragraph. */
const DESCRIBE_AUTO_SKIP_OPTIONAL = new Set([
  "powderRooms",
  "parkingSpaces",
  "outdoorFeatures",
  "numberOfFloors",
  "purchasePrice",
  "purchaseYear",
  "additional",
  "condoBuildingFloors",
  "condoFees",
  "condoSpecialAssessments",
  "monthlyRentalIncome",
  "rentPerUnit",
  "incomeHeatingIncluded",
  "incomeVacancy",
  "incomeMajorExpenses",
]);

export function toExtractableStep(step: ConversationStep): ExtractableStep {
  return {
    id: step.id,
    type: step.type,
    ask: step.ask,
    optional: step.optional,
    options: step.options,
    optionLabels: step.optionLabels,
  };
}

/** Whether this user turn looks like natural language that may hold extra answers. */
export function shouldAttemptMultiExtract(
  step: ConversationStep,
  rawValue: string
): boolean {
  const v = rawValue.trim();
  if (!v) return false;
  if (SKIP_IDS.has(step.id)) return false;
  // Exact chip / yes-no click — no extras expected
  if (step.options?.includes(v)) return false;
  if (step.type === "yesno" && /^(yes|no|oui|non)$/i.test(v)) return false;
  // Very short numeric / single token — usually answering only this step
  if (v.length < 10 && !/[,;]| and | et | with | avec |\d+\s*(bed|bath|sq|pi|m²|m2)/i.test(v)) {
    return false;
  }
  return true;
}

const ExtractedSchema = z.record(z.string());

function normalizeYesNo(value: string): "Yes" | "No" | null {
  const t = value.trim().toLowerCase();
  if (["yes", "oui", "y", "true"].includes(t)) return "Yes";
  if (["no", "non", "n", "false"].includes(t)) return "No";
  return null;
}

function matchOption(
  step: ExtractableStep,
  value: string
): string | null {
  if (!step.options?.length) return value.trim() || null;
  const v = value.trim();
  const exact = step.options.find((o) => o.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  if (step.optionLabels) {
    const idx = step.optionLabels.findIndex(
      (l) => l.toLowerCase() === v.toLowerCase()
    );
    if (idx >= 0) return step.options[idx];
  }
  // Fuzzy: option contained in value or vice versa
  const contained = step.options.find(
    (o) =>
      v.toLowerCase().includes(o.toLowerCase()) ||
      o.toLowerCase().includes(v.toLowerCase())
  );
  return contained ?? null;
}

function normalizeForStep(
  step: ExtractableStep,
  value: string
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (step.type) {
    case "yesno":
      return normalizeYesNo(trimmed);
    case "select":
      return matchOption(step, trimmed);
    case "multiselect": {
      const parts = trimmed.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) return null;
      const mapped = parts
        .map((p) => matchOption(step, p))
        .filter((p): p is string => Boolean(p));
      // dedupe preserve order
      const unique = [...new Set(mapped)];
      return unique.length ? unique.join(", ") : null;
    }
    case "number": {
      const m = trimmed.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return m ? m[0] : null;
    }
    default:
      return trimmed;
  }
}

function setIfOpen(
  out: Answers,
  already: Answers,
  byId: Record<string, ExtractableStep | undefined>,
  id: string,
  value: string | undefined | null
) {
  if (!value || !byId[id]) return;
  if (already[id] || out[id]) return;
  out[id] = value;
}

/**
 * Fast heuristics — also merges under LLM results for gaps.
 */
export function heuristicExtract(
  message: string,
  openSteps: ExtractableStep[],
  already: Answers
): Answers {
  const out: Answers = {};
  const lower = message.toLowerCase();
  const byId = Object.fromEntries(openSteps.map((s) => [s.id, s])) as Record<
    string,
    ExtractableStep | undefined
  >;

  const bed = message.match(
    /(\d+)\s*(?:bed(?:room)?s?|chambres?|ch\.?)/i
  );
  if (bed) setIfOpen(out, already, byId, "bedrooms", bed[1]);

  const bath = message.match(
    /(\d+)\s*(?:full\s+)?(?:bath(?:room)?s?|sdb|salles?\s+de\s+bain)/i
  );
  if (bath) setIfOpen(out, already, byId, "fullBathrooms", bath[1]);

  const powder = message.match(
    /(\d+)\s*(?:powder\s*rooms?|half\s*baths?|salles?\s+d['’]?eau)/i
  );
  if (powder) setIfOpen(out, already, byId, "powderRooms", powder[1]);

  const year =
    message.match(
      /(?:built|construite?|année|year)\s*(?:around|approx(?:imately)?|in|en|:)?\s*(19|20)\d{2}/i
    ) || message.match(/\b((?:19|20)\d{2})\b/);
  if (year) {
    const y = year[0].match(/(19|20)\d{2}/);
    if (y) setIfOpen(out, already, byId, "yearBuilt", y[0]);
  }

  const areaM = message.match(
    /(\d[\d\s,]*)\s*(?:m²|m2|metres?\s*carrés?|mètres?\s*carrés?|sq\.?\s*m|square\s*metres?)/i
  );
  const areaFt = message.match(
    /(\d[\d\s,]*)\s*(?:sq\.?\s*ft|sqft|pi(?:eds?)?\s*²|pi2|square\s*feet|pieds?\s*carrés?)/i
  );
  // Prefer living-space phrasing over lot size
  const livingFt = message.match(
    /(?:about|around|approximately|environ|roughly)?\s*(\d[\d\s,]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet|pi(?:eds?)?\s*²|pi2).{0,40}(?:living|habitable|space|area|superficie)/i
  ) || message.match(
    /(?:living|habitable|space|area|superficie).{0,40}(?:about|around|approximately|environ|roughly)?\s*(\d[\d\s,]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet|pi(?:eds?)?\s*²|pi2)/i
  );
  const livingM = message.match(
    /(?:about|around|approximately|environ|roughly)?\s*(\d[\d\s,]*)\s*(?:m²|m2|square\s*metres?).{0,40}(?:living|habitable|space|area|superficie)/i
  );

  if (livingM) {
    setIfOpen(out, already, byId, "livingArea", livingM[1].replace(/[\s,]/g, ""));
    setIfOpen(out, already, byId, "livingAreaUnit", "Square metres");
  } else if (livingFt) {
    setIfOpen(out, already, byId, "livingArea", livingFt[1].replace(/[\s,]/g, ""));
    setIfOpen(out, already, byId, "livingAreaUnit", "Square feet");
  } else if (areaFt && !/lot|terrain/i.test(areaFt[0] + message.slice(Math.max(0, (areaFt.index || 0) - 20), (areaFt.index || 0)))) {
    // First sq ft figure often living area when "lot" appears later
    const lotLater = /lot|terrain/i.test(message.slice((areaFt.index || 0) + areaFt[0].length));
    if (lotLater || !already.livingArea) {
      setIfOpen(out, already, byId, "livingArea", areaFt[1].replace(/[\s,]/g, ""));
      setIfOpen(out, already, byId, "livingAreaUnit", "Square feet");
    }
  } else if (areaM) {
    setIfOpen(out, already, byId, "livingArea", areaM[1].replace(/[\s,]/g, ""));
    setIfOpen(out, already, byId, "livingAreaUnit", "Square metres");
  } else {
    const bare = message.match(
      /(\d[\d\s,]{2,})\s*(?:of\s+)?(?:living\s+)?(?:space|area|superficie)/i
    );
    if (bare) setIfOpen(out, already, byId, "livingArea", bare[1].replace(/[\s,]/g, ""));
  }

  // If living area already known but unit missing, infer unit from message
  if (
    (already.livingArea || out.livingArea) &&
    !already.livingAreaUnit &&
    !out.livingAreaUnit
  ) {
    if (/square\s*feet|sq\.?\s*ft|sqft|pi(?:eds?)?\s*²|pieds?\s*carrés?/i.test(message)) {
      setIfOpen(out, already, byId, "livingAreaUnit", "Square feet");
    } else if (/square\s*metres?|m²|m2|mètres?\s*carrés?/i.test(message)) {
      setIfOpen(out, already, byId, "livingAreaUnit", "Square metres");
    }
  }

  // Prefer "5,000 sq ft lot" / "lot of 5000 sq ft" — require a size unit near the number
  const lot =
    message.match(
      /(\d[\d\s,]*)\s*(sq\.?\s*ft|sqft|square\s*feet|m²|m2|pi(?:eds?)?\s*²|pieds?\s*carrés?)\s+(?:lot|terrain)\b/i
    ) ||
    message.match(
      /(?:lot|terrain)\s+(?:of\s+|de\s+|d['’])?(?:about|around|approximately|environ|roughly)?\s*(\d[\d\s,]*)\s*(sq\.?\s*ft|sqft|square\s*feet|m²|m2|pi(?:eds?)?\s*²|pieds?\s*carrés?)/i
    ) ||
    message.match(
      /(?:on\s+a\s+)?(?:about|around|approximately|environ|roughly)\s+(\d[\d\s,]*)\s*(sq\.?\s*ft|sqft|square\s*feet|m²|m2)\s+lot\b/i
    );
  if (lot) {
    const lotNum = (lot[1] || "").replace(/[\s,]/g, "");
    const unitRaw = lot[2] || lot[0] || "";
    if (lotNum && Number(lotNum) >= 100) {
      const unitBit = /m²|m2|square\s*metres?/i.test(unitRaw) ? "m²" : "sq ft";
      setIfOpen(out, already, byId, "lotSize", `${lotNum} ${unitBit}`);
    }
  }

  const typeMap: Array<[RegExp, string]> = [
    [/\bcondo\b/i, "Condo"],
    [/\btownhouse\b|\bmaison\s+de\s+ville\b/i, "Townhouse"],
    [/\bduplex\b/i, "Duplex"],
    [/\btriplex\b/i, "Triplex"],
    [/\bfourplex\b|\bquadruplex\b/i, "Fourplex"],
    [
      /\bsingle[-\s]?family\b|\bdetached\b|\bunifamiliale\b/i,
      "Single-family home",
    ],
  ];
  for (const [re, val] of typeMap) {
    if (re.test(lower)) {
      setIfOpen(out, already, byId, "propertyType", val);
      break;
    }
  }

  // Ownership
  if (
    /\bi\s+own\b|\bwe\s+own\b|\bj['’]en\s+suis\s+propriétaire\b|\bpropriétaire\b/i.test(
      lower
    )
  ) {
    setIfOpen(out, already, byId, "ownership", "Yes");
  } else if (
    /\bcurrently\s+purchasing\b|\ben\s+voie\s+d['’]achat\b/i.test(lower)
  ) {
    setIfOpen(out, already, byId, "ownership", "Currently purchasing it");
  }

  // Garage / parking
  if (/\bdouble\s+garage\b|\bgarage\s+double\b/i.test(lower)) {
    setIfOpen(out, already, byId, "garageType", "Double garage");
  } else if (/\bgarage\b/i.test(lower) && !/\bno\s+garage\b/i.test(lower)) {
    setIfOpen(out, already, byId, "garageType", "Single garage");
  } else if (/\bno\s+garage\b|\bsans\s+garage\b/i.test(lower)) {
    setIfOpen(out, already, byId, "garageType", "No garage");
  }

  const parking = message.match(
    /(\d+)\s*(?:parking|stationnements?|places?\s+de\s+stationnement)/i
  );
  if (parking) {
    setIfOpen(out, already, byId, "parkingSpaces", parking[1]);
  } else if (/\bgarage\b.*\bdriveway\b|\bdriveway\b.*\bgarage\b|\bgarage\s+plus\s+driveway\b/i.test(lower)) {
    setIfOpen(out, already, byId, "parkingSpaces", "2");
  } else if (/\bdriveway\b|\bentrée\b/i.test(lower)) {
    setIfOpen(out, already, byId, "parkingSpaces", "1");
  }

  // Basement
  if (/\bfinished\s+basement\b|\bsous-?sol\s+aménagé\b|\bbasement\b.*\bfinished\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasBasement", "Yes");
    setIfOpen(out, already, byId, "basementFinished", "Yes");
    if (/\bpartial(?:ly)?\s+finished\b|\bpartiellement\b/i.test(lower)) {
      setIfOpen(out, already, byId, "basementDetail", "Partially finished");
    } else {
      setIfOpen(out, already, byId, "basementDetail", "Fully finished");
    }
  } else if (/\bno\s+basement\b|\bsans\s+sous-?sol\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasBasement", "No");
  } else if (/\bbasement\b|\bsous-?sol\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasBasement", "Yes");
  }

  // Pool — only set Yes when mentioned; describe-mode defaults No separately
  if (/\bin-?ground\s+pool\b|\bpiscine\s+creusée\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasPool", "Yes");
    setIfOpen(out, already, byId, "poolType", "In-ground");
  } else if (/\babove-?ground\s+pool\b|\bpiscine\s+hors\s+terre\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasPool", "Yes");
    setIfOpen(out, already, byId, "poolType", "Above-ground");
  } else if (/\bpool\b|\bpiscine\b/i.test(lower) && !/\bno\s+pool\b|\bsans\s+piscine\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasPool", "Yes");
  } else if (/\bno\s+pool\b|\bsans\s+piscine\b/i.test(lower)) {
    setIfOpen(out, already, byId, "hasPool", "No");
  }

  // Renovations
  if (
    /\brenovat|\brénov|\bkitchen\b.*(?:renovat|rénov|ago)|\broof\b.*\b(?:year|old|ago)|\btoiture\b/i.test(
      lower
    )
  ) {
    setIfOpen(out, already, byId, "hasRenovations", "Yes");
    const renoTypes: string[] = [];
    if (/\bkitchen\b|\bcuisine\b/i.test(lower)) renoTypes.push("Kitchen");
    if (/\bbathroom\s+renov|\brenovated?\s+(?:the\s+)?bath|\brénov(?:ation)?\s+.*bain/i.test(lower)) {
      renoTypes.push("Bathrooms");
    }
    if (/\broof\b|\btoiture\b/i.test(lower)) renoTypes.push("Roof");
    if (/\bbasement\b|\bsous-?sol\b/i.test(lower) && /\brenovat|rénov|finished|aménagé/i.test(lower)) {
      renoTypes.push("Basement");
    }
    if (renoTypes.length) {
      setIfOpen(out, already, byId, "renovationTypes", renoTypes.join(", "));
    }
    const dates: string[] = [];
    const kit = message.match(
      /kitchen[^.!]{0,40}?(\d+)\s*years?\s*ago|cuisine[^.!]{0,40}?il\s+y\s+a\s+(\d+)\s*ans/i
    );
    if (kit) dates.push(`Kitchen ~${kit[1] || kit[2]} years ago`);
    const roof = message.match(
      /roof[^.!]{0,40}?(\d+)\s*years?\s*ago|toiture[^.!]{0,40}?il\s+y\s+a\s+(\d+)\s*ans/i
    );
    if (roof) dates.push(`Roof ~${roof[1] || roof[2]} years ago`);
    if (dates.length) {
      setIfOpen(out, already, byId, "renovationDates", dates.join("; "));
    }
  }

  // Condition
  if (/\bfully\s+renovated\b|\bcomme\s+neuf\b|\blike\s+new\b/i.test(lower)) {
    setIfOpen(out, already, byId, "condition", "Fully renovated / like new");
  } else if (/\bvery\s+well\s+maintained\b|\btrès\s+bien\s+entretenu/i.test(lower)) {
    setIfOpen(out, already, byId, "condition", "Very well maintained");
  } else if (/\bgood\s+condition\b|\bbon\s+état\b/i.test(lower)) {
    setIfOpen(out, already, byId, "condition", "Good condition");
  } else if (/\bsome\s+work\b|\btravaux\b/i.test(lower)) {
    setIfOpen(out, already, byId, "condition", "Some work needed");
  }

  // Motivation / timeline
  if (/\bthinking\s+about\s+selling\b|\bpense\s+vendre\b|\bconsidering\s+selling\b/i.test(lower)) {
    setIfOpen(out, already, byId, "motivation", "I'm thinking about selling");
  } else if (/\bplanning\s+to\s+sell\s+soon\b|\bvendre\s+bientôt\b/i.test(lower)) {
    setIfOpen(out, already, byId, "motivation", "I'm planning to sell soon");
  } else if (/\bplanning\s+a\s+move\b|\bdéménagement\b/i.test(lower)) {
    setIfOpen(out, already, byId, "motivation", "I'm planning a move");
  } else if (/\bcurious\b|\bpreliminary\s+market\s+value\b|\bestimate\b/i.test(lower)) {
    setIfOpen(out, already, byId, "motivation", "I'm curious about the current value");
  }

  if (/\b3\s*[-–to]+\s*6\s*months\b|\bdans\s+les?\s+3\s*[-–à]+\s*6\s*mois\b/i.test(lower)) {
    setIfOpen(out, already, byId, "sellingTimeline", "Within 3–6 months");
  } else if (/\b0\s*[-–to]+\s*3\s*months\b|\bready\s+now\b/i.test(lower)) {
    setIfOpen(out, already, byId, "sellingTimeline", "Within 0–3 months");
  } else if (/\b6\s*[-–to]+\s*12\s*months\b/i.test(lower)) {
    setIfOpen(out, already, byId, "sellingTimeline", "Within 6–12 months");
  }

  // Contact
  const email = message.match(
    /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i
  );
  if (email) setIfOpen(out, already, byId, "homeownerEmail", email[1]);

  const phone = message.match(
    /(?:phone|tél(?:éphone)?|call)?\s*:?\s*(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/i
  ) || message.match(/\b(\d{3}[-.\s]\d{3}[-.\s]\d{4})\b/);
  if (phone) setIfOpen(out, already, byId, "homeownerPhone", phone[1].trim());

  const name = message.match(
    /(?:my\s+name\s+is|je\s+m['’]appelle|name\s*:)\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i
  );
  if (name) setIfOpen(out, already, byId, "homeownerName", name[1].trim());

  // Value idea — if asking for estimate, usually no firm number
  if (
    /\bwould\s+like\s+a\s+preliminary\b|\bestimate\b|\bdon['’]?t\s+know\b|\bno\s+idea\b/i.test(
      lower
    ) &&
    !/\$\s*[\d,]{3,}/.test(message)
  ) {
    setIfOpen(out, already, byId, "hasValueIdea", "No");
  }

  return out;
}

/**
 * After a ChatGPT-style describe paragraph: fill gaps + skip optional fishing.
 */
export function applyDescribeEnrichment(
  narrative: string,
  answers: Answers,
  openSteps: ExtractableStep[]
): Answers {
  const next: Answers = { ...answers };
  const heuristic = heuristicExtract(narrative, openSteps, next);
  for (const [k, v] of Object.entries(heuristic)) {
    if (v && !next[k]) next[k] = v;
  }

  // Default pool to No when never mentioned (avoid fishing after a full describe)
  const byId = Object.fromEntries(openSteps.map((s) => [s.id, s]));
  if (
    byId.hasPool &&
    !next.hasPool &&
    !/\bpool\b|\bpiscine\b/i.test(narrative)
  ) {
    next.hasPool = "No";
  }

  for (const step of openSteps) {
    if (!step.optional) continue;
    if (!DESCRIBE_AUTO_SKIP_OPTIONAL.has(step.id)) continue;
    if (next[step.id]) continue;
    next[step.id] = "Skipped";
  }

  return next;
}

export async function extractAnswersFromMessage(args: {
  message: string;
  locale: Locale;
  openSteps: ExtractableStep[];
  alreadyAnswered: Answers;
}): Promise<{ extracted: Answers; via: "llm" | "heuristic" | "none" }> {
  const open = args.openSteps.filter(
    (s) => !SKIP_IDS.has(s.id) && !s.id.startsWith("_")
  );
  if (open.length === 0) {
    return { extracted: {}, via: "none" };
  }

  const already = args.alreadyAnswered;
  const unanswered = open.filter((s) => !already[s.id]);

  // Prefer LLM; fall back to heuristics
  try {
    const openai = createOpenAIClient();
    const schemaHint = unanswered.map((s) => ({
      id: s.id,
      type: s.type,
      ask: s.ask,
      optional: Boolean(s.optional),
      options: s.options ?? null,
      optionLabels: s.optionLabels ?? null,
    }));

    const completion = await openai.chat.completions.create({
      model: EXTRACTION_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract property / buyer lead fields from a single user message for Estate Valora.
Return ONLY a JSON object mapping step id → answer string for fields clearly stated in the message.
Rules:
- Only include ids from the provided open steps list.
- Do not invent values. If unsure, omit the field.
- Extract EVERY field the message clearly supports (ownership, type, year, living area + unit, lot size, beds/baths, garage, parking, basement, pool, renovations, condition, motivation, timeline, name, email, phone).
- "I own" / "we own" → ownership "Yes".
- "finished basement" → hasBasement "Yes", basementFinished "Yes", basementDetail "Fully finished" when fully finished is implied.
- "garage" without "no garage" → garageType "Single garage" (or "Double garage" if said).
- Living area with "square feet" / "sq ft" → livingArea digits + livingAreaUnit "Square feet".
- Lot size stays free text including unit (e.g. "5000 sq ft").
- For select/yesno, use the English option values from "options" when provided (not translated labels), except buyer flows where options may already be localized — then use an exact options[] value.
- For yesno use "Yes" or "No" when options are English-style; if options include Oui/Non use those.
- For multiselect join matched options with ", ".
- For numbers return digits only (no units) unless the step type is text.
- Include contact fields when an email, phone, or "my name is …" is explicitly written.
- Message language may be English or French.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            locale: args.locale,
            message: args.message,
            openSteps: schemaHint,
            alreadyAnsweredIds: Object.keys(already).filter(
              (k) => already[k] && !k.startsWith("_")
            ),
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = ExtractedSchema.parse(JSON.parse(raw));
    const extracted: Answers = {};

    for (const step of unanswered) {
      const candidate = parsed[step.id];
      if (typeof candidate !== "string") continue;
      const normalized = normalizeForStep(step, candidate);
      if (normalized) extracted[step.id] = normalized;
    }

    // Always fill gaps with heuristics (LLM often misses units / ownership / garage)
    const heuristic = heuristicExtract(args.message, unanswered, {
      ...already,
      ...extracted,
    });
    for (const [k, v] of Object.entries(heuristic)) {
      if (v && !extracted[k]) extracted[k] = v;
    }

    if (Object.keys(extracted).length > 0) {
      return {
        extracted,
        via: Object.keys(parsed).length ? "llm" : "heuristic",
      };
    }
  } catch (err) {
    console.error("Answer extraction LLM failed:", err);
  }

  const heuristic = heuristicExtract(args.message, unanswered, already);
  const extracted: Answers = {};
  for (const step of unanswered) {
    const candidate = heuristic[step.id];
    if (!candidate) continue;
    const normalized = normalizeForStep(step, candidate);
    if (normalized) extracted[step.id] = normalized;
  }

  return {
    extracted,
    via: Object.keys(extracted).length ? "heuristic" : "none",
  };
}

export function formatCapturedNote(
  extracted: Answers,
  openSteps: ExtractableStep[],
  locale: Locale
): string {
  const labels: string[] = [];
  for (const step of openSteps) {
    const v = extracted[step.id];
    if (!v) continue;
    if (step.type === "yesno") {
      labels.push(
        locale === "fr"
          ? `${step.id}: ${v === "Yes" ? "Oui" : "Non"}`
          : `${humanize(step.id)}: ${v}`
      );
      continue;
    }
    if (step.options && step.optionLabels) {
      const parts = v.split(",").map((p) => p.trim());
      const shown = parts.map((p) => {
        const idx = step.options!.indexOf(p);
        return idx >= 0 ? step.optionLabels![idx] : p;
      });
      labels.push(shown.join(", "));
      continue;
    }
    if (step.id === "livingArea" && extracted.livingAreaUnit) {
      const unit =
        extracted.livingAreaUnit === "Square metres"
          ? locale === "fr"
            ? "m²"
            : "sq m"
          : locale === "fr"
            ? "pi²"
            : "sq ft";
      labels.push(`${v} ${unit}`);
      continue;
    }
    if (step.id === "livingAreaUnit") continue;
    labels.push(
      locale === "fr"
        ? `${humanizeFr(step.id)}: ${v}`
        : `${humanize(step.id)}: ${v}`
    );
  }

  if (labels.length === 0) return "";
  const list = labels.slice(0, 8).join(" · ");
  return locale === "fr"
    ? `J'ai aussi noté : ${list}.`
    : `I've also noted: ${list}.`;
}

/** Prefer short human phrases for common fields in the “also noted” line. */
export function refineCapturedLabels(
  extracted: Answers,
  locale: Locale
): string[] {
  const labels: string[] = [];
  if (extracted.bedrooms) {
    labels.push(
      locale === "fr"
        ? `${extracted.bedrooms} chambres`
        : `${extracted.bedrooms} bedrooms`
    );
  }
  if (extracted.fullBathrooms) {
    labels.push(
      locale === "fr"
        ? `${extracted.fullBathrooms} salles de bain`
        : `${extracted.fullBathrooms} bathrooms`
    );
  }
  if (extracted.livingArea) {
    const unit =
      extracted.livingAreaUnit === "Square metres"
        ? "m²"
        : extracted.livingAreaUnit === "Square feet"
          ? locale === "fr"
            ? "pi²"
            : "sq ft"
          : "";
    labels.push(
      unit ? `${extracted.livingArea} ${unit}` : extracted.livingArea
    );
  }
  if (extracted.yearBuilt) {
    labels.push(
      locale === "fr"
        ? `construite en ${extracted.yearBuilt}`
        : `built ${extracted.yearBuilt}`
    );
  }
  if (extracted.propertyType) labels.push(extracted.propertyType);
  if (extracted.city && extracted.postalCode) {
    labels.push(`${extracted.city}, ${extracted.postalCode}`);
  } else if (extracted.city) {
    labels.push(extracted.city);
  }
  // Any other extracted keys not covered above
  const covered = new Set([
    "bedrooms",
    "fullBathrooms",
    "livingArea",
    "livingAreaUnit",
    "yearBuilt",
    "propertyType",
    "city",
    "postalCode",
  ]);
  for (const [k, v] of Object.entries(extracted)) {
    if (covered.has(k) || k.startsWith("_") || !v) continue;
    labels.push(`${humanize(k)}: ${v}`);
  }
  return labels;
}

export function buildAlsoNotedNote(
  extracted: Answers,
  locale: Locale
): string {
  const labels = refineCapturedLabels(extracted, locale);
  if (labels.length === 0) return "";
  const list = labels.slice(0, 8).join(" · ");
  return locale === "fr"
    ? `J'ai aussi noté : ${list}.`
    : `I've also noted: ${list}.`;
}

function humanize(id: string): string {
  return id
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function humanizeFr(id: string): string {
  const map: Record<string, string> = {
    bedrooms: "chambres",
    fullBathrooms: "salles de bain",
    powderRooms: "salles d'eau",
    yearBuilt: "année",
    livingArea: "superficie",
    propertyType: "type",
    lotSize: "terrain",
    parkingSpaces: "stationnement",
  };
  return map[id] || humanize(id);
}
