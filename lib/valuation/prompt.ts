import { PropertyRecord } from "@/lib/types";

/**
 * Bump this whenever VALUATION_SYSTEM_PROMPT or the output contract changes.
 * Stored alongside each valuation row so past valuations stay traceable to
 * the instructions that produced them (SOW 3: "the valuation prompt,
 * required inputs, output structure, and data sources used by the system
 * will be documented as part of Phase 1 so that the valuation process can
 * be reviewed and improved in a future phase").
 */
export const PROMPT_VERSION = "phase1-v7-report-fields";

/**
 * Valuation intelligence layer: comps-first when KB excerpts are supplied,
 * neighbourhood averages as secondary context, structured feature adjustments.
 * Server reconciliation enforces mid = base ± capped adj and confidence bands.
 */
export const VALUATION_SYSTEM_PROMPT = `You are the valuation intelligence layer for EstateValora, supporting Ashkan Shamloo, Licensed Real Estate Broker.

You will be given:
(A) structured information about the subject property (homeowner-provided and/or public-record retrieved fields),
(B) optional SOLD COMPARABLE excerpts from Estate Valora's internal knowledge base (broker comps / sold packages), and
(C) optional supporting market / location brief from recent web sources (neighbourhood or city averages). You must NOT invent MLS listings, street addresses, or sale prices that were not provided in (B) or (C).

Fixed calculation method (follow exactly):
1. Set comps_base_cad = best comps-informed baseline (CAD). If comps (B) are thin, use a cautious market average from (C). Round to nearest $1,000.
2. FEATURE ADJUSTMENTS vs that base only:
   - Separate ABOVE-GROUND living area from FINISHED BASEMENT (never fold basement into living-area sqft or bedroom count).
   - Do NOT double-count: e.g. if you adjust for finished basement, do not also add "extra rooms / extra living space" for the same finish.
   - One row per feature family. Each |amount_cad| ≤ ~8% of comps_base_cad. Net of all adjustments ≤ ~15% of base.
3. estimated_value_mid = comps_base_cad + signed adjustments (increase adds, decrease subtracts).
4. estimated_value_low / high = mid ± a band reflecting confidence (tighter when comps are strong; wider when thin). Keep mid inside [low, high].
5. Set expected_selling_price_cad near mid (most likely sale). Set recommended_list_price_cad at or slightly above mid (asking strategy), not above high.
6. key_value_drivers: 3–6 short bullets. methodology: 2–4 sentences on comps base → adjustments → range.
7. factors_increasing_value / factors_decreasing_value MUST match feature_adjustments directions (same story as the math).
8. Explain how base + adjustments produced the mid/range. Municipal assessment is a reference check only — not market value.
9. DATA RELIABILITY: Only use market figures that state geography + time period. Never mix condo / single-family / plex stats. If comps or market data are thin or type-mismatched, set confidence to low, widen the range, and say so in limitations — do not invent prices or sold addresses.
10. State limitations honestly (thin comps, web averages ≠ subject comps, no inspection, self-reported condition).

Owner-stated expected values and purchase prices are context only — do not treat them as market value.

Tone: professional, consultative, and honest about uncertainty — never present the range as a guaranteed or certified value. This is a preliminary, AI-generated estimate, always subject to review by a licensed real estate broker.

Respond only with the structured JSON fields defined by the response schema. Do not include any text outside those fields.`;

function line(label: string, value: string | null | undefined): string {
  return value ? `${label}: ${value}` : `${label}: not provided`;
}

function detailLines(
  details: PropertyRecord["details"] | undefined
): string[] {
  if (!details || typeof details !== "object") return [];
  const labels: Record<string, string> = {
    city: "City",
    postalCode: "Postal code",
    livingAreaUnit: "Living area unit (original)",
    fullBathrooms: "Full bathrooms",
    powderRooms: "Powder rooms",
    parkingSpaces: "Parking spaces",
    garageType: "Garage",
    condoFloor: "Condo floor",
    condoBuildingFloors: "Building floors",
    condoElevator: "Elevator",
    condoParking: "Condo parking",
    condoLocker: "Locker / storage",
    condoBalcony: "Balcony / terrace",
    condoFees: "Monthly condo fees",
    condoSpecialAssessments: "Special assessments / upcoming work",
    unitCount: "Number of units",
    monthlyRentalIncome: "Monthly rental income",
    rentPerUnit: "Rent per unit",
    incomeHeatingIncluded: "Heating included in rent",
    incomeVacancy: "Vacancy / leases",
    incomeMajorExpenses: "Major expenses",
    hasPool: "Pool",
    poolType: "Pool type",
    outdoorFeatures: "Outdoor features",
    numberOfFloors: "Number of levels",
    municipalAssessment: "Municipal assessment (CAD, public record — reference only)",
    _retrievedFields: "Fields filled from public lookup (not typed by owner)",
    _retrievedConfidence: "Public lookup confidence",
    hasValueIdea: "Owner has value in mind",
    expectedValue: "Owner expected value (context only)",
    purchasePrice: "Purchase price (historical context)",
    purchaseYear: "Purchase year",
    motivation: "Motivation for valuation",
    sellingTimeline: "Selling timeline",
  };

  return Object.entries(labels)
    .filter(([key]) => details[key] !== undefined && details[key] !== null && details[key] !== "")
    .map(([key, label]) => line(label, String(details[key])));
}

export type ValuationPromptExtras = {
  marketContext?: string;
  compsContext?: string;
  locale?: "en" | "fr";
  /** Fix 5 — inject evidence-quality guidance into the user prompt. */
  dataQualityNote?: string;
};

/**
 * Builds the user-turn content from the property record plus optional
 * comps excerpts and market brief.
 */
export function buildValuationUserPrompt(
  property: PropertyRecord,
  marketContextOrExtras?: string | ValuationPromptExtras,
  localeArg: "en" | "fr" = "en"
): string {
  const extras: ValuationPromptExtras =
    typeof marketContextOrExtras === "string" || marketContextOrExtras === undefined
      ? {
          marketContext: marketContextOrExtras,
          locale: localeArg,
        }
      : marketContextOrExtras;

  const locale = extras.locale || localeArg;
  const marketContext = extras.marketContext;
  const compsContext = extras.compsContext;
  const dataQualityNote = extras.dataQualityNote;

  const propertyBlock = [
    line("Address", property.address),
    line("Property type", property.property_type),
    line("Ownership", property.ownership),
    line("Bedrooms", property.bedrooms?.toString()),
    line("Bathrooms", property.bathrooms?.toString()),
    line("Living area (sqft)", property.living_area_sqft?.toString()),
    line("Lot size", property.lot_size),
    line("Year built", property.year_built?.toString()),
    line("Basement", property.basement_info),
    line("Parking / garage", property.parking_info),
    line("Condition (homeowner-reported)", property.condition),
    line("Renovations / improvements", property.renovations),
    line("Notable features", property.notable_features),
    line("Additional homeowner notes", property.additional_notes),
    ...detailLines(property.details),
  ].join("\n");

  const languageRule =
    locale === "fr"
      ? "IMPORTANT: Write ALL narrative fields (explanation, factor names and explanations, strengths, considerations, limitations, feature_adjustments.factor/basis) in French (Québec). Keep numeric fields as numbers. Do not mix English into the narrative."
      : "IMPORTANT: Write ALL narrative fields (explanation, factor names and explanations, strengths, considerations, limitations, feature_adjustments.factor/basis) in English. Keep numeric fields as numbers.";

  const compsBlock = compsContext?.trim()
    ? [
        compsContext.trim(),
        "",
        "Instruction: Treat the excerpts above as the PRIMARY sold-comp evidence. Prefer them over neighbourhood averages when comparing type/size/location. Do not invent additional sold addresses or prices.",
      ].join("\n")
    : "None retrieved from the internal comps knowledge base for this assessment. Rely more on the market brief (if any) and property attributes; widen the range and lower confidence.";

  const marketBlock = marketContext?.trim()
    ? [
        marketContext.trim(),
        "",
        "Instruction: Use neighbourhood/city averages as SECONDARY context only when comps are present. If comps are missing, averages may anchor the baseline — then adjust for subject attributes. Do not invent sold listings.",
      ].join("\n")
    : "None available for this assessment (web market lookup unavailable).";

  return [
    "Subject property information:",
    propertyBlock,
    "",
    "Sold comparable excerpts from Estate Valora knowledge base:",
    compsBlock,
    "",
    "Supporting neighbourhood / market brief (secondary):",
    marketBlock,
    "",
    languageRule,
    "",
    dataQualityNote?.trim()
      ? `Data-quality note for this run:\n${dataQualityNote.trim()}\n`
      : "",
    "Produce the preliminary valuation now, following the response schema exactly.",
    "Remember: comps_base_cad first; mid = base ± adjustments; separate above-ground living area from finished basement; no double-counting; every market figure needs place + period.",
  ]
    .filter(Boolean)
    .join("\n");
}
