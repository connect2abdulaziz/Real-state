import { PropertyRecord } from "@/lib/types";

/**
 * Bump this whenever VALUATION_SYSTEM_PROMPT or the output contract changes.
 * Stored alongside each valuation row so past valuations stay traceable to
 * the instructions that produced them (SOW 3: "the valuation prompt,
 * required inputs, output structure, and data sources used by the system
 * will be documented as part of Phase 1 so that the valuation process can
 * be reviewed and improved in a future phase").
 */
export const PROMPT_VERSION = "phase1-v2-estatevalora";

/**
 * The valuation instructions (SOW 3: "the collected property information
 * ... will be provided to the OpenAI model using a structured valuation
 * prompt"). This is a system-level instruction set, not a fixed
 * mathematical model or comparable-sales algorithm — Phase 1 explicitly
 * does not implement either (SOW 13).
 *
 * Architecture note (EstateValora): conversation intelligence collects
 * structured answers; this prompt is the separate valuation intelligence
 * layer. Do not invent MLS comps or guaranteed sale prices.
 */
export const VALUATION_SYSTEM_PROMPT = `You are the valuation intelligence layer for EstateValora, supporting Ashkan Shamloo, Licensed Real Estate Broker.

You will be given structured information a homeowner provided about their property, plus any supporting property, location, or market information the platform has available. You will NOT be given MLS data or a comprehensive set of comparable sold properties — Phase 1 does not have access to either, so do not assume you are working from a comparable-sales dataset, and do not invent specific comparable sales, addresses, or transaction prices.

Your job:
1. Reason over the information you were given about likely value drivers for a property like this.
2. Identify concrete factors that would tend to increase the estimated value, and factors that would tend to decrease it, grounded in what was actually provided (condition, renovations, size, features, basement, parking, age, condo fees, income, etc.).
3. Produce a preliminary estimated value RANGE (a low and a high figure), not a single point value. Reflect real uncertainty: if little information is available, the range should be wider and confidence should be lower. If information is too thin to responsibly estimate, say so clearly in limitations and use a very wide range with low confidence — never invent a precise price.
4. Write a plain-language explanation a homeowner can understand, covering the reasoning behind the range.
5. Note genuine limitations of this estimate given the information available (e.g. no MLS/comparable-sales access, no interior inspection, self-reported condition).

Owner-stated expected values and purchase prices are context only — do not treat them as market value.

Tone: professional, consultative, and honest about uncertainty — never present the range as a guaranteed or certified value. This is a preliminary, AI-generated estimate, always subject to review by a licensed real estate broker before being treated as reliable.

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

/**
 * Builds the user-turn content from the homeowner's structured property
 * record, plus optional supporting market context. `marketContext` is the
 * seam for whatever "available property/location/market information" the
 * platform can supply (SOW 3) — Phase 1 has none by default (no MLS), so
 * it's optional and typically omitted, but a future phase can populate it
 * (e.g. public tax-assessor data, geocoded neighborhood stats) without
 * changing the contract.
 */
export function buildValuationUserPrompt(
  property: PropertyRecord,
  marketContext?: string
): string {
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

  return [
    "Homeowner-provided property information:",
    propertyBlock,
    "",
    "Supporting property/location/market information available to the system:",
    marketContext?.trim() ||
      "None available for this assessment. Phase 1 does not integrate MLS or comparable-sales data. Base the estimate on the property information above and general reasoning about value drivers, and reflect the lack of market data in a wider range and appropriately cautious confidence level.",
    "",
    "Produce the preliminary valuation now, following the response schema exactly.",
  ].join("\n");
}
