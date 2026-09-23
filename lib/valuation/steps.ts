import { Answers, ConversationStep } from "@/lib/types";

/**
 * EstateValora homeowner conversation script (SOW 2.1 / 2.2).
 *
 * One question at a time, adaptive follow-ups by property type and prior
 * answers, contact capture at the end (value first → trust → lead).
 *
 * Phase 1 keeps this deterministic. OpenAI-driven next-question generation
 * (SOW 4.1) can replace or wrap this script later without changing storage.
 */

const HOUSE_TYPES = ["Single-family home", "Townhouse"];
const INCOME_TYPES = [
  "Duplex",
  "Triplex",
  "Fourplex",
  "Multi-unit / income property",
];
const SELL_MOTIVATIONS = [
  "I'm thinking about selling",
  "I'm planning to sell soon",
  "I'm planning a move",
  "Estate / inheritance",
  "Separation",
];

export function isCondo(a: Answers): boolean {
  return a.propertyType === "Condo";
}

export function isHouseLike(a: Answers): boolean {
  return HOUSE_TYPES.includes(a.propertyType);
}

export function isIncomeProperty(a: Answers): boolean {
  return INCOME_TYPES.includes(a.propertyType);
}

export function maySell(a: Answers): boolean {
  return SELL_MOTIVATIONS.includes(a.motivation);
}

export const STEPS: ConversationStep[] = [
  // ---- 1. Basic property information ----
  {
    id: "streetAddress",
    section: "Property",
    type: "text",
    ask: "What is the address of the property you would like to have evaluated? Let's start with the street address.",
    placeholder: "e.g. 123 Maple Street",
  },
  {
    id: "city",
    section: "Property",
    type: "text",
    ask: "Which city is that in?",
    placeholder: "e.g. Montreal",
  },
  {
    id: "postalCode",
    section: "Property",
    type: "text",
    ask: "And the postal code?",
    placeholder: "e.g. H2X 1Y4",
  },
  {
    id: "propertyType",
    section: "Property",
    type: "select",
    ask: "What type of property is it?",
    explain:
      "The next questions adapt to your property type so we only ask what's relevant.",
    options: [
      "Single-family home",
      "Condo",
      "Townhouse",
      "Duplex",
      "Triplex",
      "Fourplex",
      "Multi-unit / income property",
      "Other",
    ],
  },
  {
    id: "ownership",
    section: "Property",
    type: "select",
    ask: "Do you currently own this property?",
    options: ["Yes", "No", "Currently purchasing it", "Other"],
    explain:
      "You can still get a preliminary estimate either way — this just helps us classify the request.",
  },

  // ---- 2. Core property characteristics ----
  {
    id: "yearBuilt",
    section: "Characteristics",
    type: "number",
    ask: "Approximately what year was the property built?",
    placeholder: "e.g. 1998",
  },
  {
    id: "livingArea",
    section: "Characteristics",
    type: "number",
    ask: "Approximately how much living space does the property have?",
    explain:
      "Living area is one of the strongest drivers of value — even a rough figure helps.",
    placeholder: "e.g. 1800",
  },
  {
    id: "livingAreaUnit",
    section: "Characteristics",
    type: "select",
    ask: "Is that in square feet or square metres?",
    options: ["Square feet", "Square metres"],
  },
  {
    id: "lotSize",
    section: "Characteristics",
    type: "text",
    ask: "Approximately how large is the lot?",
    optional: true,
    placeholder: "e.g. 5,000 sq ft or 450 m²",
    explain: "No problem if you're not sure — we can continue without it.",
    condition: (a) => !isCondo(a),
  },
  {
    id: "bedrooms",
    section: "Characteristics",
    type: "number",
    ask: "How many bedrooms does the property have?",
    placeholder: "e.g. 3",
  },
  {
    id: "fullBathrooms",
    section: "Characteristics",
    type: "number",
    ask: "How many full bathrooms does it have?",
    placeholder: "e.g. 2",
  },
  {
    id: "powderRooms",
    section: "Characteristics",
    type: "number",
    ask: "And how many powder rooms (half baths)?",
    optional: true,
    placeholder: "e.g. 1 — or skip if none",
  },
  {
    id: "parkingSpaces",
    section: "Characteristics",
    type: "number",
    ask: "How many parking spaces does the property have?",
    optional: true,
    placeholder: "e.g. 2",
    condition: (a) => !isCondo(a),
  },
  {
    id: "garageType",
    section: "Characteristics",
    type: "select",
    ask: "Is there a garage?",
    options: ["No garage", "Single garage", "Double garage", "Other"],
    condition: (a) => !isCondo(a),
  },

  // ---- Condo-specific (section 4) ----
  {
    id: "condoFloor",
    section: "Details",
    type: "number",
    ask: "What floor is the unit on?",
    placeholder: "e.g. 12",
    condition: isCondo,
  },
  {
    id: "condoBuildingFloors",
    section: "Details",
    type: "number",
    ask: "How many floors are in the building?",
    optional: true,
    placeholder: "e.g. 20",
    condition: isCondo,
  },
  {
    id: "condoElevator",
    section: "Details",
    type: "yesno",
    ask: "Is there an elevator?",
    condition: isCondo,
  },
  {
    id: "condoParking",
    section: "Details",
    type: "select",
    ask: "Does the unit have parking?",
    options: [
      "No parking",
      "Indoor parking",
      "Outdoor parking",
      "Indoor and outdoor",
      "Other",
    ],
    condition: isCondo,
  },
  {
    id: "condoLocker",
    section: "Details",
    type: "yesno",
    ask: "Does it include a locker or storage space?",
    condition: isCondo,
  },
  {
    id: "condoBalcony",
    section: "Details",
    type: "select",
    ask: "Does it have a balcony or terrace?",
    options: ["No", "Balcony", "Terrace", "Both"],
    condition: isCondo,
  },
  {
    id: "condoFees",
    section: "Details",
    type: "text",
    ask: "Approximately how much are the monthly condo fees?",
    optional: true,
    placeholder: "e.g. $450",
    condition: isCondo,
  },
  {
    id: "condoSpecialAssessments",
    section: "Details",
    type: "text",
    ask: "Are you aware of any major upcoming building work or special assessments?",
    optional: true,
    placeholder: "Optional — share if known",
    condition: isCondo,
  },

  // ---- Income-property specifics ----
  {
    id: "unitCount",
    section: "Details",
    type: "number",
    ask: "How many units are in the property?",
    placeholder: "e.g. 3",
    condition: isIncomeProperty,
  },
  {
    id: "monthlyRentalIncome",
    section: "Details",
    type: "text",
    ask: "What is the current total monthly rental income?",
    optional: true,
    placeholder: "e.g. $4,200",
    condition: isIncomeProperty,
  },
  {
    id: "rentPerUnit",
    section: "Details",
    type: "text",
    ask: "Approximately what is the rent for each unit?",
    optional: true,
    placeholder: "e.g. Unit 1: $1,400; Unit 2: $1,500",
    condition: (a) =>
      isIncomeProperty(a) &&
      !!a.unitCount &&
      parseInt(a.unitCount, 10) > 1,
  },
  {
    id: "incomeHeatingIncluded",
    section: "Details",
    type: "select",
    ask: "Is heating typically included in the rent?",
    options: ["Yes", "No", "Varies by unit", "Not sure"],
    optional: true,
    condition: isIncomeProperty,
  },
  {
    id: "incomeVacancy",
    section: "Details",
    type: "text",
    ask: "Any current vacancy, or notes about leases?",
    optional: true,
    placeholder: "Optional — e.g. fully occupied, 1 vacant",
    condition: isIncomeProperty,
  },
  {
    id: "incomeMajorExpenses",
    section: "Details",
    type: "text",
    ask: "Any major expenses worth noting (taxes, insurance, recent capital work)?",
    optional: true,
    placeholder: "Optional",
    condition: isIncomeProperty,
  },

  // ---- Single-family / townhouse conditional ----
  {
    id: "hasBasement",
    section: "Details",
    type: "yesno",
    ask: "Does the property have a basement?",
    condition: isHouseLike,
  },
  {
    id: "basementFinished",
    section: "Details",
    type: "yesno",
    ask: "Is the basement finished?",
    condition: (a) => isHouseLike(a) && a.hasBasement === "Yes",
  },
  {
    id: "basementDetail",
    section: "Details",
    type: "select",
    ask: "Is it fully finished or partially finished?",
    options: ["Fully finished", "Partially finished"],
    condition: (a) =>
      isHouseLike(a) &&
      a.hasBasement === "Yes" &&
      a.basementFinished === "Yes",
  },
  {
    id: "hasPool",
    section: "Details",
    type: "yesno",
    ask: "Does the property have a pool?",
    condition: isHouseLike,
  },
  {
    id: "poolType",
    section: "Details",
    type: "select",
    ask: "Is it an above-ground or in-ground pool?",
    options: ["Above-ground", "In-ground", "Other"],
    condition: (a) => isHouseLike(a) && a.hasPool === "Yes",
  },
  {
    id: "outdoorFeatures",
    section: "Details",
    type: "multiselect",
    ask: "Does the property have any notable outdoor features?",
    optional: true,
    explain: "Select all that apply, or skip if none stand out.",
    options: [
      "Large backyard",
      "Terrace",
      "Landscaped yard",
      "Corner lot",
      "Wooded lot",
      "Waterfront",
      "Park-facing",
      "Exceptional view",
    ],
    condition: isHouseLike,
  },
  {
    id: "numberOfFloors",
    section: "Details",
    type: "number",
    ask: "How many levels does the home have?",
    optional: true,
    placeholder: "e.g. 2",
    condition: isHouseLike,
  },

  // ---- 3. Condition & improvements ----
  {
    id: "hasRenovations",
    section: "Condition",
    type: "select",
    ask: "Have you made any significant renovations or improvements to the property?",
    options: ["Yes", "No", "Not sure"],
  },
  {
    id: "renovationTypes",
    section: "Condition",
    type: "multiselect",
    ask: "What major improvements or renovations have you completed?",
    explain: "Select all that apply.",
    options: [
      "Kitchen",
      "Bathrooms",
      "Flooring",
      "Windows",
      "Roof",
      "Basement",
      "Exterior",
      "Landscaping",
      "Pool",
      "HVAC",
      "Other",
    ],
    condition: (a) => a.hasRenovations === "Yes",
  },
  {
    id: "renovationDates",
    section: "Condition",
    type: "text",
    ask: "Approximately when were these renovations completed?",
    placeholder: "e.g. Kitchen 2022; roof 2019",
    explain: "You can list more than one date if work happened over time.",
    condition: (a) => a.hasRenovations === "Yes",
  },
  {
    id: "condition",
    section: "Condition",
    type: "select",
    ask: "How would you describe the overall condition of the property?",
    explain:
      "Condition often explains the gap between similar homes on the same street.",
    options: [
      "Fully renovated / like new",
      "Very well maintained",
      "Good condition",
      "Some work needed",
      "Significant work needed",
    ],
  },
  {
    id: "additional",
    section: "Condition",
    type: "text",
    ask: "Is there anything else about the property you'd like considered before we prepare your estimate?",
    optional: true,
    placeholder: "Optional — share anything relevant",
  },

  // ---- 5–8. Perception, purchase, motivation, timeline ----
  {
    id: "hasValueIdea",
    section: "Motivation",
    type: "select",
    ask: "Do you already have an idea of what your property might be worth today?",
    options: ["Yes", "No", "Not sure"],
    explain:
      "This is for context and lead qualification — not treated as the market value.",
  },
  {
    id: "expectedValue",
    section: "Motivation",
    type: "text",
    ask: "What value do you have in mind?",
    placeholder: "e.g. around $650,000",
    condition: (a) => a.hasValueIdea === "Yes",
  },
  {
    id: "purchasePrice",
    section: "Motivation",
    type: "text",
    ask: "Approximately how much did you pay for the property when you purchased it?",
    optional: true,
    placeholder: "Skip if unknown",
  },
  {
    id: "purchaseYear",
    section: "Motivation",
    type: "number",
    ask: "What year did you purchase the property?",
    optional: true,
    placeholder: "e.g. 2015",
  },
  {
    id: "motivation",
    section: "Motivation",
    type: "select",
    ask: "What prompted you to check the value of your property today?",
    options: [
      "I'm thinking about selling",
      "I'm planning to sell soon",
      "I'm considering refinancing",
      "I'm curious about the current value",
      "I'm planning a move",
      "Estate / inheritance",
      "Separation",
      "Investment purposes",
      "Other",
    ],
  },
  {
    id: "sellingTimeline",
    section: "Motivation",
    type: "select",
    ask: "How soon would you consider selling?",
    options: [
      "I'm ready now",
      "Within 0–3 months",
      "Within 3–6 months",
      "Within 6–12 months",
      "More than 12 months",
      "I'm not sure yet",
    ],
    condition: maySell,
  },

  // ---- 9. Lead capture (after value has been created in the conversation) ----
  {
    id: "homeownerName",
    section: "Contact",
    type: "text",
    ask: "Before I prepare your valuation, what is your name?",
    placeholder: "Full name",
  },
  {
    id: "homeownerEmail",
    section: "Contact",
    type: "text",
    ask: "Where should we send your EstateValora valuation report?",
    placeholder: "you@example.com",
  },
  {
    id: "homeownerPhone",
    section: "Contact",
    type: "text",
    ask: "What is the best phone number to reach you if you would like to discuss the valuation with a real estate professional?",
    optional: true,
    placeholder: "Optional — (555) 555-5555",
    explain: "Phone is optional — you can skip if you prefer.",
  },
];

export const SECTIONS = [
  "Property",
  "Characteristics",
  "Details",
  "Condition",
  "Motivation",
  "Contact",
] as const;

/** Returns the steps that apply given the answers collected so far. */
export function visibleSteps(answers: Answers): ConversationStep[] {
  return STEPS.filter((s) => !s.condition || s.condition(answers));
}

export const FIELD_LABELS: Record<string, string> = {
  streetAddress: "Street address",
  city: "City",
  postalCode: "Postal code",
  propertyType: "Property type",
  ownership: "Ownership",
  yearBuilt: "Year built",
  livingArea: "Living area",
  livingAreaUnit: "Living area unit",
  lotSize: "Lot size",
  bedrooms: "Bedrooms",
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
  condoFees: "Condo fees",
  condoSpecialAssessments: "Special assessments",
  unitCount: "Number of units",
  monthlyRentalIncome: "Monthly rental income",
  rentPerUnit: "Rent per unit",
  incomeHeatingIncluded: "Heating included",
  incomeVacancy: "Vacancy / leases",
  incomeMajorExpenses: "Major expenses",
  hasBasement: "Basement",
  basementFinished: "Basement finished",
  basementDetail: "Basement detail",
  hasPool: "Pool",
  poolType: "Pool type",
  outdoorFeatures: "Outdoor features",
  numberOfFloors: "Levels",
  hasRenovations: "Renovations",
  renovationTypes: "Renovation types",
  renovationDates: "Renovation dates",
  condition: "Condition",
  additional: "Additional notes",
  hasValueIdea: "Has value in mind",
  expectedValue: "Expected value",
  purchasePrice: "Purchase price",
  purchaseYear: "Purchase year",
  motivation: "Motivation",
  sellingTimeline: "Selling timeline",
  homeownerName: "Name",
  homeownerEmail: "Email",
  homeownerPhone: "Phone",
};
