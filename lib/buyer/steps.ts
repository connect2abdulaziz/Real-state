import { Answers, ConversationStep } from "@/lib/types";
import type { Locale } from "@/lib/i18n/copy";

export type BuyerSection =
  | "Preferences"
  | "Budget"
  | "Timeline"
  | "Qualification"
  | "Contact";

export const BUYER_SECTIONS: BuyerSection[] = [
  "Preferences",
  "Budget",
  "Timeline",
  "Qualification",
  "Contact",
];

type LocalizedStep = Omit<ConversationStep, "section" | "ask" | "explain" | "placeholder" | "options"> & {
  section: BuyerSection;
  ask: Record<Locale, string>;
  explain?: Record<Locale, string>;
  placeholder?: Record<Locale, string>;
  options?: Record<Locale, string[]>;
  condition?: (answers: Answers) => boolean;
};

const BUYER_STEPS_I18N: LocalizedStep[] = [
  {
    id: "preferredCity",
    section: "Preferences",
    type: "text",
    ask: {
      en: "Which city or area are you looking to buy in?",
      fr: "Dans quelle ville ou quel secteur souhaitez-vous acheter?",
    },
    placeholder: {
      en: "e.g. Montreal, Plateau, West Island",
      fr: "ex. Montréal, Plateau, West Island",
    },
  },
  {
    id: "preferredNeighborhoods",
    section: "Preferences",
    type: "text",
    optional: true,
    ask: {
      en: "Any neighbourhoods or boroughs you prefer? (optional)",
      fr: "Avez-vous des quartiers ou arrondissements préférés? (facultatif)",
    },
    placeholder: {
      en: "e.g. Outremont, Verdun, Laval",
      fr: "ex. Outremont, Verdun, Laval",
    },
  },
  {
    id: "buyerPropertyType",
    section: "Preferences",
    type: "select",
    ask: {
      en: "What type of property are you looking for?",
      fr: "Quel type de propriété recherchez-vous?",
    },
    options: {
      en: [
        "Single-family home",
        "Condo",
        "Townhouse",
        "Duplex / income property",
        "Open to several types",
        "Other",
      ],
      fr: [
        "Maison unifamiliale",
        "Condo",
        "Maison de ville",
        "Duplex / immeuble à revenus",
        "Ouvert à plusieurs types",
        "Autre",
      ],
    },
  },
  {
    id: "buyerBeds",
    section: "Preferences",
    type: "select",
    ask: {
      en: "How many bedrooms do you need?",
      fr: "Combien de chambres avez-vous besoin?",
    },
    options: {
      en: ["1", "2", "3", "4+", "Flexible"],
      fr: ["1", "2", "3", "4+", "Flexible"],
    },
  },
  {
    id: "buyerBudget",
    section: "Budget",
    type: "select",
    ask: {
      en: "What is your approximate purchase budget?",
      fr: "Quel est votre budget d'achat approximatif?",
    },
    explain: {
      en: "This helps us match you with realistic options — not a credit check.",
      fr: "Cela nous aide à vous proposer des options réalistes — ce n'est pas une vérification de crédit.",
    },
    options: {
      en: [
        "Under $400,000",
        "$400,000 – $600,000",
        "$600,000 – $800,000",
        "$800,000 – $1,000,000",
        "$1,000,000 – $1,500,000",
        "Over $1,500,000",
        "Prefer not to say",
      ],
      fr: [
        "Moins de 400 000 $",
        "400 000 $ – 600 000 $",
        "600 000 $ – 800 000 $",
        "800 000 $ – 1 000 000 $",
        "1 000 000 $ – 1 500 000 $",
        "Plus de 1 500 000 $",
        "Préfère ne pas dire",
      ],
    },
  },
  {
    id: "preApproved",
    section: "Budget",
    type: "select",
    ask: {
      en: "Are you pre-approved for a mortgage?",
      fr: "Êtes-vous préapprouvé pour un prêt hypothécaire?",
    },
    options: {
      en: ["Yes", "In progress", "Not yet", "Cash purchase / no mortgage"],
      fr: ["Oui", "En cours", "Pas encore", "Achat comptant / sans hypothèque"],
    },
  },
  {
    id: "buyingTimeline",
    section: "Timeline",
    type: "select",
    ask: {
      en: "When are you hoping to buy?",
      fr: "Quand souhaitez-vous acheter?",
    },
    options: {
      en: [
        "Ready now (0–3 months)",
        "Within 3–6 months",
        "6–12 months",
        "Just exploring",
      ],
      fr: [
        "Prêt maintenant (0–3 mois)",
        "Dans 3–6 mois",
        "6–12 mois",
        "Je explore seulement",
      ],
    },
  },
  {
    id: "firstTimeBuyer",
    section: "Qualification",
    type: "yesno",
    ask: {
      en: "Are you a first-time homebuyer?",
      fr: "Êtes-vous un premier acheteur?",
    },
  },
  {
    id: "mustSellFirst",
    section: "Qualification",
    type: "select",
    ask: {
      en: "Do you need to sell a current property before you buy?",
      fr: "Devez-vous vendre une propriété actuelle avant d'acheter?",
    },
    options: {
      en: ["Yes", "No", "Maybe / depends"],
      fr: ["Oui", "Non", "Peut-être / ça dépend"],
    },
  },
  {
    id: "buyerPriorities",
    section: "Qualification",
    type: "multiselect",
    optional: true,
    ask: {
      en: "What matters most in your next home? (optional — pick any that apply)",
      fr: "Qu'est-ce qui compte le plus pour votre prochain chez-vous? (facultatif)",
    },
    options: {
      en: [
        "Location / commute",
        "Schools",
        "Outdoor space",
        "Parking",
        "Move-in ready",
        "Investment potential",
        "Building amenities",
      ],
      fr: [
        "Emplacement / trajet",
        "Écoles",
        "Espace extérieur",
        "Stationnement",
        "Prêt à emménager",
        "Potentiel d'investissement",
        "Commodités de l'immeuble",
      ],
    },
  },
  {
    id: "buyerNotes",
    section: "Qualification",
    type: "text",
    optional: true,
    ask: {
      en: "Anything else we should know? (optional)",
      fr: "Autre chose que nous devrions savoir? (facultatif)",
    },
    placeholder: {
      en: "e.g. must allow pets, elevator building…",
      fr: "ex. animaux acceptés, immeuble avec ascenseur…",
    },
  },
  {
    id: "homeownerName",
    section: "Contact",
    type: "text",
    ask: {
      en: "What's your name?",
      fr: "Quel est votre nom?",
    },
    placeholder: { en: "Full name", fr: "Nom complet" },
  },
  {
    id: "homeownerEmail",
    section: "Contact",
    type: "text",
    ask: {
      en: "What's the best email to reach you?",
      fr: "Quelle est la meilleure adresse courriel pour vous joindre?",
    },
    placeholder: { en: "you@email.com", fr: "vous@courriel.com" },
  },
  {
    id: "homeownerPhone",
    section: "Contact",
    type: "text",
    optional: true,
    ask: {
      en: "And a phone number? (optional)",
      fr: "Et un numéro de téléphone? (facultatif)",
    },
    placeholder: {
      en: "Optional — (514) 555-5555",
      fr: "Facultatif — (514) 555-5555",
    },
    explain: {
      en: "Phone is optional — you can skip if you prefer.",
      fr: "Le téléphone est facultatif — vous pouvez passer.",
    },
  },
];

export function getBuyerSteps(locale: Locale): ConversationStep[] {
  return BUYER_STEPS_I18N.map((s) => ({
    id: s.id,
    section: s.section as ConversationStep["section"],
    type: s.type,
    optional: s.optional,
    condition: s.condition,
    ask: s.ask[locale],
    explain: s.explain?.[locale],
    placeholder: s.placeholder?.[locale],
    options: s.options?.[locale],
  }));
}

export function visibleBuyerSteps(
  answers: Answers,
  locale: Locale
): ConversationStep[] {
  return getBuyerSteps(locale).filter(
    (s) => !s.condition || s.condition(answers)
  );
}

/** Simple readiness score for admin display. */
export function qualifyBuyer(answers: Answers): {
  status: "hot" | "warm" | "exploring";
  label: string;
  labelFr: string;
} {
  const timeline = answers.buyingTimeline || "";
  const pre = answers.preApproved || "";
  const readyNow =
    timeline.includes("0–3") ||
    timeline.includes("0-3") ||
    timeline.includes("Ready now") ||
    timeline.includes("Prêt maintenant");
  const preOk =
    pre === "Yes" ||
    pre === "Oui" ||
    pre.includes("Cash") ||
    pre.includes("comptant");

  if (readyNow && preOk) {
    return {
      status: "hot",
      label: "Ready buyer",
      labelFr: "Acheteur prêt",
    };
  }
  if (
    readyNow ||
    timeline.includes("3–6") ||
    timeline.includes("3-6") ||
    preOk ||
    pre.includes("progress") ||
    pre.includes("cours")
  ) {
    return {
      status: "warm",
      label: "Active search",
      labelFr: "Recherche active",
    };
  }
  return {
    status: "exploring",
    label: "Exploring",
    labelFr: "Exploration",
  };
}

export const BUYER_FIELD_LABELS: Record<string, { en: string; fr: string }> = {
  preferredCity: { en: "Preferred area", fr: "Secteur préféré" },
  preferredNeighborhoods: { en: "Neighbourhoods", fr: "Quartiers" },
  buyerPropertyType: { en: "Property type", fr: "Type de propriété" },
  buyerBeds: { en: "Bedrooms", fr: "Chambres" },
  buyerBudget: { en: "Budget", fr: "Budget" },
  preApproved: { en: "Pre-approved", fr: "Préapprouvé" },
  buyingTimeline: { en: "Buying timeline", fr: "Échéancier d'achat" },
  firstTimeBuyer: { en: "First-time buyer", fr: "Premier acheteur" },
  mustSellFirst: { en: "Must sell first", fr: "Doit vendre d'abord" },
  buyerPriorities: { en: "Priorities", fr: "Priorités" },
  buyerNotes: { en: "Notes", fr: "Notes" },
  homeownerName: { en: "Name", fr: "Nom" },
  homeownerEmail: { en: "Email", fr: "Courriel" },
  homeownerPhone: { en: "Phone", fr: "Téléphone" },
  intent: { en: "Intent", fr: "Intention" },
  locale: { en: "Language", fr: "Langue" },
};
