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
    "What’s the full address — street and neighbourhood or city? (I’ll use it to personalize things.)",
  city: "Which city or neighbourhood is that in?",
  propertyType:
    "What type of home is it — bungalow, cottage, condo, townhouse, duplex…?",
  bedrooms: "How many bedrooms does it have?",
  fullBathrooms: "And how many bathrooms?",
  yearBuilt:
    "About what year was it built? (Approx is totally fine — no need to dig up the archives!)",
  condition: "How would you describe the overall condition?",
  hasRenovations: "Any major renovations lately?",
  garageType: "Is there a garage — none, single, or double?",
  hasPool: "Does it have a swimming pool?",
  livingArea: "Do you happen to know the living area (sq ft or m²)?",
  lotSize: "Roughly how big is the lot, if you know?",
};

const NEXT_ASK_FR: Record<string, string> = {
  streetAddress:
    "Quelle est l’adresse complète — rue et quartier ou ville? (Ça m’aide à personnaliser.)",
  city: "Dans quelle ville ou quel quartier?",
  propertyType:
    "Quel type de propriété — bungalow, cottage, condo, maison de ville, duplex…?",
  bedrooms: "Combien de chambres?",
  fullBathrooms: "Et combien de salles de bain?",
  yearBuilt:
    "Environ en quelle année a-t-elle été construite? (Approx c’est parfait — pas besoin d’être aux archives!)",
  condition: "Comment décririez-vous l’état général?",
  hasRenovations: "Des rénovations majeures récemment?",
  garageType: "Y a-t-il un garage — aucun, simple ou double?",
  hasPool: "Y a-t-il une piscine?",
  livingArea: "Connaissez-vous la superficie habitable (pi² ou m²)?",
  lotSize: "Et la taille approximative du terrain, si vous la savez?",
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

  const voiceFr = `VOIX (priorité absolue — comme un assistant immobilier chaleureux type Eva.IA):
- Parle comme une vraie personne serviable: souriante, calme, confiante — JAMAIS robotique ni « rapport ».
- Chaque tour: 1) validation courte qui reprend ce qu'ils ont dit 2) une phrase utile si besoin 3) UNE seule question.
- Exemples de validations: « Absolument, avec plaisir! 🏠 », « Parfait — 28 Rue de Josselin à Blainville, noté! 📍 », « Super, une unifamiliale. 👍 », « (Pas besoin d'être précis au jour près — on n'est pas aux Archives nationales! 😂 ) ».
- Transitions naturelles: « Absolument », « Parfait », « Super », « D'accord », « Cela dit… ».
- 1–2 emojis max par message (🏠📍👍😂) — pas une pluie d'emojis.
- INTERDIT: titres du genre « Estimation préliminaire », « Mise à jour », « Réponse », listes « merci de fournir: … », jargon froid, ton formulaire, blocs --- sauf pour une fourchette $.
- Phrases courtes. Tutoiement/vouvoiement: vouvoiement poli et chaleureux (Québec).`;

  const voiceEn = `VOICE (highest priority — warm Eva.IA-style real-estate chat):
- Sound like a helpful real person: friendly, calm, confident — NEVER robotic or "report-like".
- Every turn: 1) short acknowledgement that mirrors what they said 2) one useful line if needed 3) exactly ONE question (unless giving a range).
- Acknowledgement examples: "Absolutely — happy to help! 🏠", "Perfect — 28 Rue de Josselin in Blainville, got it! 📍", "Great, a single-family home. 👍", "(No need to be precise to the day — we're not at the national archives! 😂)".
- Natural bridges: "Absolutely", "Perfect", "Great", "Got it", "That said…".
- At most 1–2 light emojis per message (🏠📍👍😂) — never spam.
- FORBIDDEN: headings like "Preliminary Estimate", "Updated Estimate", "Answer", bullet dumps of "please provide: address, type…", cold jargon, form tone, --- dividers except when showing a $ range.
- Keep sentences short and conversational.`;

  if (locale === "fr") {
    const intakeRules = intake.intakeMode
      ? `Mode estimation / vente:
- Suit la VOIX ci-dessus.
- Si « Enough for preliminary CAD range: NO »: AUCUNE fourchette $. Validation chaleureuse + UNE question (celle suggérée).
- Si « Enough… YES »: une fourchette CAD courte en **gras**, ton conversationnel (« Voici une fourchette indicative… »), puis au plus UNE question pour affiner.
- Ne redemande JAMAIS un fait déjà dans « Known facts ».
- Nouveaux faits après une fourchette: ajuste-la ou explique brièvement pourquoi elle reste proche — ne recopie pas le même texte.
- Rappelle doucement que c'est indicatif et qu'Ashkan Shamloo peut peaufiner — sans sonner légaliste.`
      : `Mode marché / conseil:
- Suit la VOIX ci-dessus.
- Questions larges (tendances, timing, budget): pas d'essai générique — accueille + UNE question utile (quartier, budget, type, horizon).
- Chiffres fiables quand tu en as; sinon dis-le simplement et clarifie.
- Oriente naturellement vers une estimation personnalisée ou Ashkan si pertinent.`;

    return {
      system: `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).
Tu es un guide immobilier virtuel amical — pas un formulaire, pas un moteur de recherche froid.

${voiceFr}

${NO_SOURCES_FR}

${intakeRules}

Mise en forme:
- Messages courts (souvent 2–5 phrases). **Gras** seulement pour les montants clés.
- Pas de tableaux. Pas de # titres. Pas de structure « Rapport ».

Recherche:
${searchRulesFr}
- Comps Estate Valora: utilise en silence. Ne dis jamais « PDF » / « knowledge base ».
- Mémoire: « Recent conversation » + état d'intake.
- N'invente pas de prix. Réponds en français (Québec).`,
      turnHint: intake.intakeMode
        ? intake.enoughForEstimate
          ? `- Mode amical: validation + fourchette CAD courte (faits connus) + au plus UNE question.
- Si les faits viennent de changer, mets à jour la fourchette (ne répète pas la même).`
          : `- Mode amical: PAS de $. Validation qui reprend leurs mots + EXACTEMENT une question (Suggested next question).
- Sonner humain (Eva), pas robot.`
        : `- Mode amical: bref contexte si utile + EXACTEMENT une question de clarification.
- Pas d'essai. Si « vendre / estimer », passe en intake (une question).`,
    };
  }

  const intakeRulesEn = intake.intakeMode
    ? `Seller / estimate mode:
- Follow VOICE above.
- If "Enough for preliminary CAD range: NO": NO $ range. Warm ack + exactly ONE question (the suggested one).
- If "Enough… YES": one short preliminary CAD range in **bold**, said conversationally ("Here's a rough ballpark…"), then at most ONE refine question.
- NEVER re-ask Known facts.
- New facts after a range: update the band or briefly say why it's similar — don't paste the same reply.
- Softly note it's indicative and Ashkan Shamloo can refine — don't sound legalistic.`
    : `Market / advisory mode:
- Follow VOICE above.
- Broad starters (trends, timing, buy budget): no generic essay — warm ack + ONE clarifying question (area, budget, type, timeline).
- Reliable figures when you have them; otherwise say so simply and clarify.
- Naturally invite a personalized estimate or Ashkan when it fits.`;

  return {
    system: `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).
You are a friendly virtual real-estate guide — not a form, not a cold search engine.

${voiceEn}

${NO_SOURCES_EN}

${intakeRulesEn}

Formatting:
- Keep replies short (often 2–5 sentences). **Bold** only for key dollar figures.
- No tables. No # headings. No "report" structure.

Search:
${searchRulesEn}
- Estate Valora comps: use silently. Never say "PDF" / "knowledge base".
- Memory: "Recent conversation" plus intake state.
- Do not invent prices. Reply in English.`,
    turnHint: intake.intakeMode
      ? intake.enoughForEstimate
        ? `- Friendly mode: warm ack + short CAD range (known facts) + at most ONE question.
- If facts just changed, update the range (do not repeat the same one).`
        : `- Friendly mode: NO $. Ack that mirrors their words + EXACTLY one question (Suggested next question).
- Sound human (Eva-like), not robotic.`
      : `- Friendly mode: short context if useful + EXACTLY one clarifying question.
- No essay. If they want to sell/estimate, switch to intake (one question).`,
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
