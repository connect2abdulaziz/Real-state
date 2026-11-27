/**
 * Eva-style seller intake helpers for /chat:
 * slot tracking, estimate gating, and shared prompt rules.
 */

import type { Answers } from "@/lib/types";
import { STEPS } from "@/lib/valuation/steps";
import {
  toExtractableStep,
  type ExtractableStep,
} from "@/lib/conversation/extract-answers";

/** Seller-relevant fields we track in chat answers. */
export const CHAT_SELLER_SLOT_IDS = [
  "streetAddress",
  "city",
  "postalCode",
  "propertyType",
  "yearBuilt",
  "livingArea",
  "livingAreaUnit",
  "lotSize",
  "bedrooms",
  "fullBathrooms",
  "garageType",
  "hasPool",
  "poolType",
  "hasRenovations",
  "renovationTypes",
  "condition",
  "additional",
] as const;

export type ChatSellerSlotId = (typeof CHAT_SELLER_SLOT_IDS)[number];

const SLOT_SET = new Set<string>(CHAT_SELLER_SLOT_IDS);

/** Priority order for the single follow-up question. */
const ASK_ORDER: ChatSellerSlotId[] = [
  "streetAddress",
  "city",
  "propertyType",
  "bedrooms",
  "fullBathrooms",
  "yearBuilt",
  "condition",
  "hasRenovations",
  "garageType",
  "hasPool",
  "livingArea",
  "lotSize",
];

const SLOT_LABELS_EN: Record<string, string> = {
  streetAddress: "address",
  city: "city",
  postalCode: "postal code",
  propertyType: "property type",
  yearBuilt: "year built",
  livingArea: "living area",
  livingAreaUnit: "area unit",
  lotSize: "lot size",
  bedrooms: "bedrooms",
  fullBathrooms: "bathrooms",
  garageType: "garage",
  hasPool: "pool",
  poolType: "pool type",
  hasRenovations: "renovations",
  renovationTypes: "renovation types",
  condition: "overall condition",
  additional: "extra features",
};

const SLOT_LABELS_FR: Record<string, string> = {
  streetAddress: "adresse",
  city: "ville",
  postalCode: "code postal",
  propertyType: "type de propriété",
  yearBuilt: "année de construction",
  livingArea: "superficie habitable",
  livingAreaUnit: "unité de superficie",
  lotSize: "taille du terrain",
  bedrooms: "chambres",
  fullBathrooms: "salles de bain",
  garageType: "garage",
  hasPool: "piscine",
  poolType: "type de piscine",
  hasRenovations: "rénovations",
  renovationTypes: "types de rénovations",
  condition: "état général",
  additional: "caractéristiques supplémentaires",
};

const NEXT_ASK_EN: Record<string, string> = {
  streetAddress:
    "What’s the full address (street, neighbourhood/city)?",
  city: "Which city or neighbourhood is that in?",
  propertyType:
    "What type of property is it — single-family, condo, townhouse, duplex…?",
  bedrooms: "How many bedrooms does it have?",
  fullBathrooms: "How many bathrooms?",
  yearBuilt: "About what year was it built? (Approx is fine.)",
  condition: "What’s the overall condition of the home?",
  hasRenovations: "Any major renovations recently?",
  garageType: "Is there a garage (none / single / double)?",
  hasPool: "Does it have a swimming pool?",
  livingArea: "Do you know the living area (sq ft or m²)?",
  lotSize: "Do you know the approximate lot size?",
};

const NEXT_ASK_FR: Record<string, string> = {
  streetAddress:
    "Quelle est l’adresse complète (rue, quartier/ville)?",
  city: "Dans quelle ville ou quel quartier?",
  propertyType:
    "Quel type de propriété — unifamiliale, condo, maison de ville, duplex…?",
  bedrooms: "Combien de chambres?",
  fullBathrooms: "Combien de salles de bain?",
  yearBuilt: "Environ en quelle année a-t-elle été construite? (Approx ok.)",
  condition: "Quel est l’état général de la maison?",
  hasRenovations: "Y a-t-il eu des rénovations majeures récemment?",
  garageType: "Y a-t-il un garage (aucun / simple / double)?",
  hasPool: "Y a-t-il une piscine?",
  livingArea: "Connaissez-vous la superficie habitable (pi² ou m²)?",
  lotSize: "Connaissez-vous la taille approximative du terrain?",
};

export type ChatIntakeState = {
  intakeMode: boolean;
  enoughForEstimate: boolean;
  knownFacts: string[];
  missingIds: string[];
  nextAskId: string | null;
  nextAskHint: string | null;
  stateBlock: string;
};

function filled(answers: Answers, id: string): boolean {
  const v = answers[id];
  return typeof v === "string" && v.trim().length > 0;
}

export function hasLocation(answers: Answers): boolean {
  return filled(answers, "streetAddress") || filled(answers, "city");
}

/**
 * Minimum for a first preliminary range:
 * location + (type OR bedrooms) + at least one of baths / year / area / condition-renos / garage-pool.
 */
export function isEnoughForEstimate(answers: Answers): boolean {
  if (!hasLocation(answers)) return false;
  const typeOrBeds =
    filled(answers, "propertyType") || filled(answers, "bedrooms");
  if (!typeOrBeds) return false;
  const extras =
    filled(answers, "fullBathrooms") ||
    filled(answers, "yearBuilt") ||
    filled(answers, "livingArea") ||
    filled(answers, "condition") ||
    filled(answers, "hasRenovations") ||
    filled(answers, "renovationTypes") ||
    filled(answers, "garageType") ||
    filled(answers, "hasPool") ||
    filled(answers, "poolType") ||
    filled(answers, "additional");
  return extras;
}

export function getChatExtractableSteps(already: Answers): ExtractableStep[] {
  return STEPS.filter((s) => SLOT_SET.has(s.id) && !filled(already, s.id)).map(
    toExtractableStep
  );
}

/** Detect sell / home-worth / estimate intent (or ongoing intake with slots). */
export function detectSellEstimateIntent(args: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  answers: Answers;
}): boolean {
  if (hasLocation(args.answers) || filled(args.answers, "bedrooms")) {
    return true;
  }
  if (args.answers._chatIntake === "1") return true;

  const blob = [
    args.message,
    ...args.history.map((h) => h.content),
  ]
    .join("\n")
    .toLowerCase();

  if (
    /\b(sell|selling|sale|list\s+my|put\s+(it|my\s+home)\s+on\s+the\s+market|good\s+time\s+to\s+sell)\b/.test(
      blob
    )
  ) {
    return true;
  }
  if (
    /\b(estimate|valuation|appraise|worth|value\s+of\s+my|home\s+value|property\s+value|market\s+value|property\s+worth|today['’]?s\s+market)\b/.test(
      blob
    )
  ) {
    return true;
  }
  if (
    /\b(vendre|vente|estimation|évaluer|évaluat|combien\s+vaut|valeur\s+(de\s+)?(ma|mon|la)\s+|prix\s+de\s+mon|bon\s+moment\s+pour\s+vendre)\b/.test(
      blob
    )
  ) {
    return true;
  }
  // Civic-looking address in this turn
  if (looksLikeCivicAddress(args.message)) return true;

  return false;
}

export function looksLikeCivicAddress(message: string): boolean {
  const t = message.trim();
  if (t.length < 8 || t.length > 160) return false;
  // Starts with civic number + street word, or "number Name, City"
  if (
    /^\d{1,6}\s+\S+/.test(t) &&
    /\b(rue|street|st\.?|boulevard|blvd\.?|avenue|ave\.?|chemin|ch\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|place|pl\.?|court|ct\.?|way|terrace|croissant|cres\.?)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (/^\d{1,6}\s+[^,]{3,},\s*[A-Za-zÀ-ÿ\s\-']{2,}$/i.test(t)) {
    return true;
  }
  return false;
}

/**
 * Light heuristic when the whole message is basically an address.
 */
export function heuristicChatAddress(message: string, already: Answers): Answers {
  const out: Answers = {};
  if (filled(already, "streetAddress")) return out;
  if (!looksLikeCivicAddress(message)) return out;

  const trimmed = message.trim().replace(/\s+/g, " ");
  const comma = trimmed.indexOf(",");
  if (comma > 0) {
    out.streetAddress = trimmed.slice(0, comma).trim();
    const rest = trimmed.slice(comma + 1).trim();
    // City may include province — take first segment
    const cityPart = rest.split(",")[0]?.trim();
    if (cityPart && !filled(already, "city")) {
      // Strip trailing Quebec / QC / Canada noise
      out.city = cityPart
        .replace(/\b(quebec|québec|qc|canada)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  } else {
    out.streetAddress = trimmed;
  }
  return out;
}

function missingSlotIds(answers: Answers): string[] {
  const missing: string[] = [];
  for (const id of ASK_ORDER) {
    if (id === "city" && filled(answers, "streetAddress") && filled(answers, "city")) {
      continue;
    }
    if (id === "city" && filled(answers, "streetAddress")) {
      // City often embedded in address text — only ask if clearly absent
      const addr = answers.streetAddress || "";
      if (/,/.test(addr) || filled(answers, "city")) continue;
    }
    if (id === "poolType") continue;
    if (!filled(answers, id)) missing.push(id);
  }
  // Skip garage/pool asks if condo
  if (answers.propertyType === "Condo") {
    return missing.filter(
      (id) => id !== "garageType" && id !== "hasPool" && id !== "lotSize"
    );
  }
  return missing;
}

function formatKnownFacts(answers: Answers, locale: "en" | "fr"): string[] {
  const labels = locale === "fr" ? SLOT_LABELS_FR : SLOT_LABELS_EN;
  const facts: string[] = [];
  for (const id of CHAT_SELLER_SLOT_IDS) {
    if (!filled(answers, id)) continue;
    if (id === "livingAreaUnit") continue;
    let value = answers[id]!.trim();
    if (id === "livingArea" && filled(answers, "livingAreaUnit")) {
      value = `${value} ${answers.livingAreaUnit}`;
    }
    facts.push(`${labels[id] || id}: ${value}`);
  }
  return facts;
}

export function buildChatIntakeState(args: {
  answers: Answers;
  locale: "en" | "fr";
  intakeMode: boolean;
}): ChatIntakeState {
  const knownFacts = formatKnownFacts(args.answers, args.locale);
  const missingIds = args.intakeMode ? missingSlotIds(args.answers) : [];
  const nextAskId = missingIds[0] || null;
  const askMap = args.locale === "fr" ? NEXT_ASK_FR : NEXT_ASK_EN;
  const nextAskHint = nextAskId ? askMap[nextAskId] || null : null;
  const enoughForEstimate =
    args.intakeMode && isEnoughForEstimate(args.answers);

  const labels = args.locale === "fr" ? SLOT_LABELS_FR : SLOT_LABELS_EN;
  const missingLabels = missingIds
    .slice(0, 6)
    .map((id) => labels[id] || id);

  const lines: string[] = [
    `Intake mode: ${args.intakeMode ? "YES (seller / estimate conversation)" : "NO (general market Q&A)"}`,
    `Enough for preliminary CAD range: ${enoughForEstimate ? "YES" : "NO — do NOT give a CAD range yet"}`,
  ];
  if (knownFacts.length) {
    lines.push(`Known facts (never re-ask these):\n- ${knownFacts.join("\n- ")}`);
  } else {
    lines.push("Known facts: (none yet)");
  }
  if (args.intakeMode) {
    lines.push(
      missingLabels.length
        ? `Still missing (ask only ONE — prefer the first): ${missingLabels.join(", ")}`
        : "Still missing: none critical"
    );
    if (nextAskHint) {
      lines.push(`Suggested next question: ${nextAskHint}`);
    }
  }

  return {
    intakeMode: args.intakeMode,
    enoughForEstimate,
    knownFacts,
    missingIds,
    nextAskId,
    nextAskHint,
    stateBlock: lines.join("\n"),
  };
}

const NO_SOURCES_EN = `ABSOLUTE RULE — NEVER show sources in the reply:
- Do NOT write any website name, domain, URL, broker site, or portal (e.g. HonestDoor, Centris, Remax, *.ca, *.com).
- NO parentheses like (loaamanseur-remax.ca) or (centris.ca).
- NO "according to…", "based on…", "per…", "Sources:", "References:".
- Search the web silently; output only numbers + context + place/period when known.`;

const NO_SOURCES_FR = `RÈGLE ABSOLUE — JAMAIS de sources dans la réponse:
- N'écris AUCUN nom de site, domaine, URL, courtier-web, portail (ex. HonestDoor, Centris, Remax, *.ca, *.com).
- PAS de parenthèses du type (loaamanseur-remax.ca) ou (centris.ca).
- PAS de "selon…", "d'après…", "basé sur…", "Sources:", "Références:".
- Cherche sur le web en silence; donne seulement les chiffres + contexte + période/lieu si connu.`;

/**
 * Shared system prompt for web_search and comps-only fallback.
 */
export function buildChatSystemPromptParts(args: {
  locale: "en" | "fr";
  openSearch: boolean;
  preferredPortals: string;
  intake: ChatIntakeState;
}): { system: string; turnHint: string } {
  const { locale, openSearch, preferredPortals, intake } = args;

  const searchRulesEn = openSearch
    ? `- Use web_search freely across the public web (ChatGPT-style) for any useful question — market, neighbourhood, trends, context.
- You are NOT limited to a fixed list of websites. Prefer recent credible results — but NEVER name those sites in the user-facing reply.
- For prices: prefer figures that name place + time period; if figures disagree, say so briefly WITHOUT naming a site.
- Run focused searches when useful (neighbourhood, property type, year).`
    : `- Use web_search for neighbourhood averages / medians and city context.
- Internally prefer: ${preferredPortals}. NEVER cite them in the user-facing reply.
- Search queries should include neighbourhood + city + "average home price" / "median sold" / "single-family" and the year when relevant.
- If several figures appear, lead with the best neighbourhood average/median; Montreal secondary — without naming any site.`;

  const searchRulesFr = openSearch
    ? `- Utilise web_search librement sur tout le web public (comme ChatGPT), pour toute question utile — marché immobilier, quartier, tendances, contexte.
- Tu n'es PAS limité à une liste de sites. Cherche ce qui est le plus récent et crédible — mais NE NOMME JAMAIS les sites dans la réponse.
- Pour les prix: privilégie des chiffres avec lieu + période; si les sources divergent, dis-le brièvement SANS nommer de site.
- Fais des recherches ciblées si utile (quartier, type de propriété, année).`
    : `- Utilise web_search pour moyennes / médianes de quartier et contexte ville.
- En interne seulement, privilégie: ${preferredPortals}. NE les cite JAMAIS dans la réponse utilisateur.
- Les requêtes doivent inclure quartier + ville + "prix moyen" / "médiane vendue" / "unifamiliale" et l'année si pertinent.
- S'il y a plusieurs chiffres, mène avec la meilleure moyenne/médiane de quartier; Montréal en secondaire — sans nommer de site.`;

  if (locale === "fr") {
    const intakeRules = intake.intakeMode
      ? `Mode estimation / vente (obligatoire):
- Ton chaleureux et naturel (style Eva) — pas robotique. Courtes validations qui reprennent ce que la personne a dit (ex. « Parfait — Blainville, noté! 📍 »). Léger emoji OK (🏠📍👍).
- JAMAIS de titres robotiques du type « Estimation préliminaire mise à jour ».
- Si « Enough for preliminary CAD range: NO »: AUCUNE fourchette en $. Accueille + UNE seule question (celle suggérée). Pas de liste « merci de fournir: adresse, type, année… ».
- Si « Enough… YES »: tu peux donner UNE fourchette CAD préliminaire (**gras**), courte, basée sur les faits connus + comps internes + web. Puis au plus UNE question pour affiner.
- Ne redemande JAMAIS un fait déjà dans « Known facts ».
- Si de nouveaux faits arrivent après une fourchette: ajuste la fourchette (serre / élargis / décale) OU explique en une phrase pourquoi elle reste similaire — ne recopie pas le même paragraphe.
- Estimation indicative seulement; Ashkan Shamloo révise.`
      : `Mode marché / conseil (obligatoire):
- Assistant immobilier intelligent — pas un moteur de recherche de quartier.
- Questions larges (tendances, timing, budget d’achat): NE donne PAS un essai générique. Accueille + pose UNE question utile (quartier/ville, budget, type, horizon).
- Utilise des données fiables quand tu en as; sinon dis-le brièvement et clarifie.
- Oriente naturellement vers une estimation personnalisée ou une discussion avec Ashkan quand c’est pertinent.
- Fourchette pour une adresse précise seulement si assez de détails; sinon une question.`;

    return {
      system: `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).
Réponds de façon fluide et amicale — pas un long essai, pas un formulaire.

${NO_SOURCES_FR}

${intakeRules}

Mise en forme:
- **Gras** pour les chiffres clés quand tu en donnes.
- Tu peux séparer avec --- si tu donnes une fourchette.
- Pas de tableaux. Pas de # titres. Pas de roman.

Recherche:
${searchRulesFr}
- Listings Estate Valora / PDF: utilise en silence. Ne dis jamais « PDF » / « knowledge base ».
- Mémoire: suis « Recent conversation » + le bloc d'état d'intake.
- N'invente pas de prix. Réponds en français (Québec).`,
      turnHint: intake.intakeMode
        ? intake.enoughForEstimate
          ? `- Intake: assez d'infos → fourchette CAD courte qui reflète les faits connus; puis au plus UNE question manquante.
- Si les faits viennent de changer, mets à jour la fourchette (ne répète pas la même).`
          : `- Intake: PAS de fourchette CAD. Accueille brièvement + pose EXACTEMENT une question (voir Suggested next question).
- N'invente pas de détails manquants.`
        : `- Question large (marché / achat / tendances): bref contexte si utile, puis EXACTEMENT une question de clarification (quartier, budget, type, horizon).
- Pas d’essai générique. Oriente vers une estimation personnalisée ou Ashkan si naturel.
- Si la personne bascule vers « vendre / estimer ma maison », passe en mode intake (une question).`,
    };
  }

  const intakeRulesEn = intake.intakeMode
    ? `Seller / estimate mode (required):
- Warm, natural tone (Eva-style) — not robotic. Short acknowledgements that mirror what they said (e.g. "Perfect — Blainville, got it! 📍"). Light emoji OK (🏠📍👍).
- NEVER use robotic headings like "Updated Preliminary Estimate".
- If "Enough for preliminary CAD range: NO": give NO dollar range. Warm ack + exactly ONE question (the suggested one). Do NOT dump a bullet list of "please provide: address, type, year…".
- If "Enough… YES": give ONE short preliminary CAD range (**bold**), grounded in known facts + silent comps + web. Then at most ONE refine question.
- NEVER re-ask anything already listed under Known facts.
- When new facts arrive after a range: shift/tighten/widen the range OR briefly say why the band stays similar — do not paste the same paragraph again.
- Indicative only; Ashkan Shamloo reviews.`
    : `General market / advisory mode (required):
- You are a comprehensive real estate intelligence assistant — not a neighbourhood search tool.
- Broad starters (market trends, buy budget, timing): do NOT dump a generic essay. Warm ack + ask ONE clarifying question (neighbourhood/city, budget, property type, or timeline).
- Use reliable figures when you have them; if not, say so briefly and clarify location/period.
- Naturally guide toward a personalized valuation or a conversation with Ashkan when appropriate.
- A specific-home CAD range only if they already gave enough detail; otherwise one useful question.`;

  return {
    system: `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).
Reply in a fluid, friendly way — not a long essay, not a form dump.

${NO_SOURCES_EN}

${intakeRulesEn}

Formatting:
- **Bold** key figures when you give them.
- You may use --- when giving a range.
- No tables. No # headings. No essays.

Search:
${searchRulesEn}
- Estate Valora listings / PDF comps: use silently. Never say "PDF" / "knowledge base".
- Memory: use "Recent conversation" plus the intake state block.
- Do not invent prices. Reply in English.`,
    turnHint: intake.intakeMode
      ? intake.enoughForEstimate
        ? `- Intake: enough info → short CAD range that reflects known facts; then at most ONE missing question.
- If facts just changed, update the range (do not repeat the same one).`
        : `- Intake: NO CAD range. Brief warm ack + ask EXACTLY one question (see Suggested next question).
- Do not invent missing details.`
      : `- Broad market / buy / trends question: short context if useful, then EXACTLY one clarifying question (area, budget, property type, or timeline).
- No generic essay. Guide toward personalized valuation or Ashkan when natural.
- If they switch to "sell / estimate my home", switch to intake (one question).`,
  };
}

/** Compact system prompt for comps-only Chat Completions fallback. */
export function buildChatFallbackSystemPrompt(
  locale: "en" | "fr",
  intake: ChatIntakeState
): string {
  const { system, turnHint } = buildChatSystemPromptParts({
    locale,
    openSearch: true,
    preferredPortals: "",
    intake,
  });
  return `${system}

This turn:
${turnHint}

Intake state:
${intake.stateBlock}`;
}
