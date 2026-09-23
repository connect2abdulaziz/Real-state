import { Answers, PropertyDetails } from "@/lib/types";

function toIntOrNull(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Convert living area to sqft when the homeowner answered in square metres. */
export function livingAreaSqft(answers: Answers): number | null {
  const raw = toNumOrNull(answers.livingArea);
  if (raw === null) return null;
  if (answers.livingAreaUnit === "Square metres") {
    return Math.round(raw * 10.7639);
  }
  return Math.round(raw);
}

export function composeAddress(answers: Answers): string | null {
  const parts = [answers.streetAddress, answers.city, answers.postalCode]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function composeBathrooms(answers: Answers): number | null {
  const full = toNumOrNull(answers.fullBathrooms) ?? 0;
  const powder = toNumOrNull(answers.powderRooms) ?? 0;
  if (!answers.fullBathrooms && !answers.powderRooms) return null;
  // Half baths count as 0.5 for a single numeric column.
  return full + powder * 0.5;
}

export function composeBasement(answers: Answers): string | null {
  if (answers.hasBasement === "No") return "None";
  if (answers.hasBasement !== "Yes") return null;
  if (answers.basementFinished === "No") return "Unfinished";
  if (answers.basementDetail) return answers.basementDetail;
  if (answers.basementFinished === "Yes") return "Finished";
  return "Yes (detail not specified)";
}

export function composeParking(answers: Answers): string | null {
  if (answers.condoParking) return answers.condoParking;
  const parts: string[] = [];
  if (answers.parkingSpaces) {
    parts.push(`${answers.parkingSpaces} space(s)`);
  }
  if (answers.garageType) parts.push(answers.garageType);
  return parts.length ? parts.join(" · ") : null;
}

export function composeRenovations(answers: Answers): string | null {
  if (answers.hasRenovations === "No") return "None reported";
  if (answers.hasRenovations === "Not sure") return "Not sure";
  if (answers.hasRenovations !== "Yes") return null;
  const parts: string[] = [];
  if (answers.renovationTypes) parts.push(answers.renovationTypes);
  if (answers.renovationDates) parts.push(`Dates: ${answers.renovationDates}`);
  return parts.length ? parts.join(" — ") : "Yes (detail not specified)";
}

export function composeNotableFeatures(answers: Answers): string | null {
  const parts: string[] = [];
  if (answers.hasPool === "Yes") {
    parts.push(answers.poolType ? `Pool (${answers.poolType})` : "Pool");
  }
  if (answers.outdoorFeatures) parts.push(answers.outdoorFeatures);
  if (answers.numberOfFloors) {
    parts.push(`${answers.numberOfFloors} level(s)`);
  }
  if (answers.condoBalcony && answers.condoBalcony !== "No") {
    parts.push(answers.condoBalcony);
  }
  if (answers.condoLocker === "Yes") parts.push("Locker / storage");
  if (answers.condoElevator === "Yes") parts.push("Elevator");
  return parts.length ? parts.join("; ") : null;
}

function detail(
  answers: Answers,
  keys: string[]
): PropertyDetails {
  const out: PropertyDetails = {};
  for (const key of keys) {
    const v = answers[key];
    if (v !== undefined && v !== "") out[key] = v;
  }
  return out;
}

/**
 * Builds the normalized property insert payload from conversation answers.
 */
export function buildPropertyInsert(
  answers: Answers,
  conversationId: string,
  homeownerId: string | null
) {
  const details = detail(answers, [
    "streetAddress",
    "city",
    "postalCode",
    "livingAreaUnit",
    "fullBathrooms",
    "powderRooms",
    "parkingSpaces",
    "garageType",
    "condoFloor",
    "condoBuildingFloors",
    "condoElevator",
    "condoParking",
    "condoLocker",
    "condoBalcony",
    "condoFees",
    "condoSpecialAssessments",
    "unitCount",
    "monthlyRentalIncome",
    "rentPerUnit",
    "incomeHeatingIncluded",
    "incomeVacancy",
    "incomeMajorExpenses",
    "hasPool",
    "poolType",
    "outdoorFeatures",
    "numberOfFloors",
    "hasValueIdea",
    "expectedValue",
    "purchasePrice",
    "purchaseYear",
    "motivation",
    "sellingTimeline",
  ]);

  return {
    homeowner_id: homeownerId,
    conversation_id: conversationId,
    address: composeAddress(answers),
    property_type: answers.propertyType || null,
    bedrooms: toIntOrNull(answers.bedrooms),
    bathrooms: composeBathrooms(answers),
    living_area_sqft: livingAreaSqft(answers),
    lot_size: answers.lotSize || null,
    year_built: toIntOrNull(answers.yearBuilt),
    basement_info: composeBasement(answers),
    parking_info: composeParking(answers),
    condition: answers.condition || null,
    renovations: composeRenovations(answers),
    notable_features: composeNotableFeatures(answers),
    additional_notes: answers.additional || null,
    ownership: answers.ownership || null,
    details,
  };
}
