import type { Locale } from "@/lib/i18n/copy";
import { Answers, ConversationStep } from "@/lib/types";
import { STEPS } from "@/lib/valuation/steps";

/** French overlays for seller steps — option arrays must match English length/order. */
const FR: Record<
  string,
  {
    ask: string;
    explain?: string;
    placeholder?: string;
    options?: string[];
  }
> = {
  streetAddress: {
    ask: "Quelle est l'adresse de la propriété que vous souhaitez faire évaluer? Commençons par l'adresse civique.",
    placeholder: "ex. 123 rue Maple",
  },
  city: {
    ask: "Dans quelle ville se trouve-t-elle?",
    placeholder: "ex. Montréal",
  },
  postalCode: {
    ask: "Et le code postal?",
    placeholder: "ex. H2X 1Y4",
  },
  propertyType: {
    ask: "De quel type de propriété s'agit-il?",
    explain:
      "Les prochaines questions s'adaptent à votre type de propriété pour ne demander que ce qui est pertinent.",
    options: [
      "Maison unifamiliale",
      "Condo",
      "Maison de ville",
      "Duplex",
      "Triplex",
      "Quadruplex",
      "Immeuble à revenus / multi-logements",
      "Autre",
    ],
  },
  ownership: {
    ask: "Êtes-vous actuellement propriétaire de cette propriété?",
    explain:
      "Vous pouvez obtenir une estimation préliminaire dans tous les cas — cela nous aide à classer la demande.",
    options: ["Oui", "Non", "En cours d'achat", "Autre"],
  },
  yearBuilt: {
    ask: "Environ en quelle année la propriété a-t-elle été construite?",
    placeholder: "ex. 1998",
  },
  livingArea: {
    ask: "Quelle est approximativement la superficie habitable?",
    explain:
      "La superficie habitable est l'un des principaux facteurs de valeur — même une estimation aide.",
    placeholder: "ex. 1800",
  },
  livingAreaUnit: {
    ask: "Est-ce en pieds carrés ou en mètres carrés?",
    options: ["Pieds carrés", "Mètres carrés"],
  },
  lotSize: {
    ask: "Quelle est approximativement la taille du terrain?",
    placeholder: "ex. 5000 pi² ou 450 m²",
  },
  bedrooms: {
    ask: "Combien de chambres à coucher?",
    placeholder: "ex. 3",
  },
  fullBathrooms: {
    ask: "Combien de salles de bain complètes?",
    placeholder: "ex. 2",
  },
  powderRooms: {
    ask: "Combien de salles d'eau (toilette seulement)?",
    placeholder: "ex. 1",
  },
  parkingSpaces: {
    ask: "Combien de places de stationnement?",
    placeholder: "ex. 2",
  },
  garageType: {
    ask: "Y a-t-il un garage?",
    options: ["Aucun garage", "Garage simple", "Garage double", "Autre"],
  },
  condoFloor: {
    ask: "À quel étage se trouve le condo?",
    placeholder: "ex. 12",
  },
  condoBuildingFloors: {
    ask: "Combien d'étages compte l'immeuble?",
    placeholder: "ex. 20",
  },
  condoElevator: {
    ask: "Y a-t-il un ascenseur?",
  },
  condoParking: {
    ask: "Le condo a-t-il un stationnement?",
    options: [
      "Aucun stationnement",
      "Stationnement intérieur",
      "Stationnement extérieur",
      "Intérieur et extérieur",
      "Autre",
    ],
  },
  condoLocker: {
    ask: "Y a-t-il un casier ou un espace de rangement?",
  },
  condoBalcony: {
    ask: "Y a-t-il un balcon ou une terrasse?",
    options: ["Non", "Balcon", "Terrasse", "Les deux"],
  },
  condoFees: {
    ask: "Quels sont approximativement les frais de condo mensuels?",
    placeholder: "ex. 450 $",
  },
  condoSpecialAssessments: {
    ask: "Connaissez-vous des travaux majeurs à venir ou des cotisations spéciales?",
    placeholder: "Facultatif — indiquez si vous savez",
  },
  unitCount: {
    ask: "Combien de logements / unités?",
    placeholder: "ex. 3",
  },
  monthlyRentalIncome: {
    ask: "Quel est le revenu locatif mensuel total actuel?",
    placeholder: "ex. 4 200 $",
  },
  rentPerUnit: {
    ask: "Pouvez-vous préciser le loyer par unité? (facultatif)",
    placeholder: "ex. 1 500 $ / 1 600 $ / 1 400 $",
  },
  incomeHeatingIncluded: {
    ask: "Le chauffage est-il inclus dans les loyers?",
    options: ["Oui", "Non", "Varie selon l'unité", "Je ne suis pas sûr"],
  },
  incomeVacancy: {
    ask: "Y a-t-il une vacance actuelle, ou des notes sur les baux?",
    placeholder: "Facultatif — ex. entièrement loué, 1 vacant",
  },
  incomeMajorExpenses: {
    ask: "Y a-t-il des dépenses majeures à noter? (facultatif)",
    placeholder: "ex. toiture 2023, taxes élevées…",
  },
  hasBasement: {
    ask: "Y a-t-il un sous-sol?",
  },
  basementFinished: {
    ask: "Le sous-sol est-il aménagé?",
  },
  basementDetail: {
    ask: "Comment décririez-vous l'aménagement du sous-sol?",
    options: ["Entièrement aménagé", "Partiellement aménagé"],
  },
  hasPool: {
    ask: "Y a-t-il une piscine?",
  },
  poolType: {
    ask: "Quel type de piscine?",
    options: ["Hors terre", "Creusée", "Autre"],
  },
  outdoorFeatures: {
    ask: "La propriété a-t-elle des caractéristiques extérieures notables?",
    explain: "Cochez tout ce qui s'applique, ou passez si rien ne se démarque.",
    options: [
      "Grande cour",
      "Terrasse",
      "Cour paysagée",
      "Terrain d'angle",
      "Terrain boisé",
      "Bord de l'eau",
      "Face à un parc",
      "Vue exceptionnelle",
    ],
  },
  numberOfFloors: {
    ask: "Combien de niveaux a la propriété?",
    placeholder: "ex. 2",
  },
  hasRenovations: {
    ask: "Avez-vous fait des rénovations ou améliorations importantes?",
    options: ["Oui", "Non", "Je ne suis pas sûr"],
  },
  renovationTypes: {
    ask: "Quelles améliorations ou rénovations majeures avez-vous réalisées?",
    explain: "Cochez tout ce qui s'applique.",
    options: [
      "Cuisine",
      "Salles de bain",
      "Planchers",
      "Fenêtres",
      "Toiture",
      "Sous-sol",
      "Extérieur",
      "Aménagement paysager",
      "Piscine",
      "CVAC",
      "Autre",
    ],
  },
  renovationDates: {
    ask: "Environ quand ces rénovations ont-elles été faites?",
    placeholder: "ex. Cuisine 2022; toiture 2019",
    explain: "Vous pouvez indiquer plusieurs dates si les travaux se sont échelonnés.",
  },
  condition: {
    ask: "Comment décririez-vous l'état général de la propriété?",
    explain:
      "L'état explique souvent l'écart entre des maisons semblables sur la même rue.",
    options: [
      "Entièrement rénovée / comme neuve",
      "Très bien entretenue",
      "Bon état",
      "Quelques travaux nécessaires",
      "Travaux importants nécessaires",
    ],
  },
  additional: {
    ask: "Y a-t-il autre chose à considérer avant de préparer votre estimation?",
    placeholder: "Facultatif — partagez tout ce qui est pertinent",
  },
  hasValueIdea: {
    ask: "Avez-vous déjà une idée de la valeur actuelle de votre propriété?",
    options: ["Oui", "Non", "Je ne suis pas sûr"],
    explain:
      "Pour le contexte et la qualification — ce n'est pas traité comme la valeur marchande.",
  },
  expectedValue: {
    ask: "Quelle valeur avez-vous en tête?",
    placeholder: "ex. autour de 650 000 $",
  },
  purchasePrice: {
    ask: "Environ combien avez-vous payé lors de l'achat?",
    placeholder: "Passer si inconnu",
  },
  purchaseYear: {
    ask: "En quelle année avez-vous acheté la propriété?",
    placeholder: "ex. 2015",
  },
  motivation: {
    ask: "Qu'est-ce qui vous amène à vérifier la valeur de votre propriété aujourd'hui?",
    options: [
      "Je pense à vendre",
      "Je prévois vendre bientôt",
      "Je considère un refinancement",
      "Je suis curieux de la valeur actuelle",
      "Je prévois un déménagement",
      "Succession / héritage",
      "Séparation",
      "Objectifs d'investissement",
      "Autre",
    ],
  },
  sellingTimeline: {
    ask: "Dans quel délai envisageriez-vous de vendre?",
    options: [
      "Je suis prêt maintenant",
      "Dans 0–3 mois",
      "Dans 3–6 mois",
      "Dans 6–12 mois",
      "Plus de 12 mois",
      "Je ne suis pas encore sûr",
    ],
  },
  homeownerName: {
    ask: "Avant de préparer votre estimation, quel est votre nom?",
    placeholder: "Nom complet",
  },
  homeownerEmail: {
    ask: "Où devons-nous envoyer votre rapport d'estimation Estate Valora?",
    placeholder: "vous@exemple.com",
  },
  homeownerPhone: {
    ask: "Quel est le meilleur numéro pour vous joindre si vous souhaitez discuter de l'estimation avec un professionnel?",
    placeholder: "Facultatif — (514) 555-5555",
    explain: "Le téléphone est facultatif — vous pouvez passer.",
  },
};

/**
 * Returns seller steps in the active locale.
 * Option *values* stay English (for conditions + valuation); labels show in locale.
 */
export function getSellerSteps(locale: Locale): ConversationStep[] {
  if (locale !== "fr") return STEPS;

  return STEPS.map((step) => {
    const fr = FR[step.id];
    if (!fr) return step;
    const labels = fr.options;
    return {
      ...step,
      ask: fr.ask,
      explain: fr.explain ?? step.explain,
      placeholder: fr.placeholder ?? step.placeholder,
      // Keep English values for storage/conditions; show French labels
      options: step.options,
      optionLabels: labels && step.options && labels.length === step.options.length
        ? labels
        : undefined,
    };
  });
}

export function visibleSellerSteps(
  answers: Answers,
  locale: Locale
): ConversationStep[] {
  const steps = getSellerSteps(locale);
  return steps.filter((s) => !s.condition || s.condition(answers));
}

export function sellerSectionLabel(
  section: string,
  locale: Locale
): string {
  if (locale !== "fr") return section;
  const map: Record<string, string> = {
    Property: "Propriété",
    Characteristics: "Caractéristiques",
    Details: "Détails",
    Condition: "État",
    Motivation: "Motivation",
    Contact: "Coordonnées",
    Preferences: "Préférences",
    Budget: "Budget",
    Timeline: "Échéancier",
    Qualification: "Qualification",
  };
  return map[section] || section;
}

export const SELLER_FIELD_LABELS_FR: Record<string, string> = {
  streetAddress: "Adresse",
  city: "Ville",
  postalCode: "Code postal",
  propertyType: "Type de propriété",
  ownership: "Propriété",
  yearBuilt: "Année de construction",
  livingArea: "Superficie habitable",
  livingAreaUnit: "Unité de superficie",
  lotSize: "Terrain",
  bedrooms: "Chambres",
  fullBathrooms: "Salles de bain",
  powderRooms: "Salles d'eau",
  parkingSpaces: "Stationnement",
  garageType: "Garage",
  condition: "État",
  motivation: "Motivation",
  sellingTimeline: "Échéancier de vente",
  homeownerName: "Nom",
  homeownerEmail: "Courriel",
  homeownerPhone: "Téléphone",
  expectedValue: "Valeur estimée (client)",
  purchasePrice: "Prix d'achat",
  purchaseYear: "Année d'achat",
};
