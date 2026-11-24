/**
 * Option 2 for /chat: OpenAI Responses API + web_search
 * so neighbourhood averages (HonestDoor, etc.) can be found like ChatGPT.
 */

export type ChatWebSearchResult = {
  text: string;
  via: "web_search" | "skipped" | "failed";
  sources: string[];
};

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  if (typeof p.output_text === "string" && p.output_text.trim()) {
    return p.output_text.trim();
  }
  const output = p.output;
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.type === "message" && Array.isArray(row.content)) {
      for (const c of row.content) {
        if (
          c &&
          typeof c === "object" &&
          (c as { type?: string }).type === "output_text" &&
          typeof (c as { text?: string }).text === "string"
        ) {
          chunks.push((c as { text: string }).text);
        }
      }
    }
  }
  return chunks.join("\n").trim();
}

function extractSources(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const urls = new Set<string>();
  const walk = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.url === "string" && obj.url.startsWith("http")) {
      urls.add(obj.url);
    }
    if (obj.type === "url_citation" && typeof obj.url === "string") {
      urls.add(obj.url);
    }
    Object.values(obj).forEach(walk);
  };
  walk(p.output);
  return [...urls].slice(0, 8);
}

export function isChatWebSearchEnabled(): boolean {
  if (process.env.CHAT_WEB_SEARCH === "false") return false;
  if (process.env.CHAT_WEB_SEARCH === "true") return true;
  // Inherit valuation flag when chat flag unset
  return process.env.VALUATION_WEB_SEARCH !== "false";
}

/** Best generally available chat + tools model (override with OPENAI_CHAT_MODEL). */
export function resolveChatModel(): string {
  return (
    process.env.OPENAI_CHAT_MODEL ||
    process.env.OPENAI_MARKET_MODEL ||
    process.env.OPENAI_VALUATION_MODEL ||
    "gpt-4.1"
  );
}

/**
 * Answer a user question with live web_search, grounded also by Estate Valora
 * comps excerpts and recent chat turns.
 */
export async function answerWithWebSearch(args: {
  message: string;
  locale: "en" | "fr";
  compsContext: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatWebSearchResult> {
  if (!isChatWebSearchEnabled()) {
    return { text: "", via: "skipped", sources: [] };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: "", via: "failed", sources: [] };
  }

  const model = resolveChatModel();
  const historyBlock =
    args.history.length === 0
      ? ""
      : `\nRecent conversation (MUST use for follow-ups — resolve "that", "there", "it", "the average you said", "compare", "and for condos" against these turns; do not pretend you lack prior context):\n${args.history
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n\n")}\n`;

  const system =
    args.locale === "fr"
      ? `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).
Tu réponds comme un conseiller immobilier clair et chaleureux.

Format (obligatoire):
- Texte simple uniquement. Pas de Markdown: pas de #, **, __, listes -, tableaux |, ni blocs de code.
- Phrases courtes, paragraphes aérés (sauts de ligne).
- Structure typique: 1) réponse directe avec le chiffre, 2) court contexte marché, 3) une phrase de réserve Ashkan.
- N'utilise jamais de titres markdown ni de tableaux.
- AUCUNE référence visible: pas d'URLs, pas de liste Sources/Références, pas de "selon HonestDoor / Centris / Equipe AJ…", pas de citations markdown. Utilise les sources seulement en interne pour trouver les chiffres.

Contenu et recherche:
- Utilise web_search pour moyennes / médianes de quartier et contexte ville.
- Sources préférées (cherche-les d'abord, en silence): HonestDoor, Centris, Equipe AJ (equipeaj.ca), OpenHouse QC (openhouseqc.com), HousingPortal (housingportal.ca), realtor.ca, Association professionnelle des courtiers immobiliers du Québec (APCIQ / QAREB), JLR. Préfère les stats de portails / rapports de quartier aux blogues SEO.
- Fais plusieurs recherches ciblées si utile: prix moyen / médiane unifamiliale du quartier; jours sur le marché / % du prix demandé; contexte Montréal ou arrondissement.
- Les requêtes doivent inclure quartier + ville + "prix moyen" / "médiane vendue" / "unifamiliale" et l'année si pertinent (ex. "Saint-Léonard Montréal Centris prix moyen unifamiliale", "Saint-Léonard OpenHouse", "Anjou Saint-Léonard HousingPortal").
- S'il y a plusieurs chiffres, mène avec la moyenne/médiane du quartier d'une source préférée; la moyenne Montréal n'est qu'un contexte secondaire.
- Question sur une propriété précise (adresse + chambres / salles de bain / caractéristiques): 1) moyenne ou médiane unifamiliale du quartier, 2) court contexte Montréal / arrondissement, 3) fourchette CAD préliminaire ajustée aux atouts (sous-sol aménagé, garage, état) seulement si les stats web le supportent, 4) réserve Ashkan — sans nommer de sites.
- Si des listings Estate Valora pertinents sont fournis, tu peux t'en inspirer en silence; ne les présente pas comme "références".
- Si aucun comparable PDF n'est utile: NE LE DIS PAS. Donne simplement la réponse marché. Ne mentionne jamais "PDF", "extraits", "knowledge base", "comps manquants" ou "non fourni".
- Distingue moyenne de quartier vs estimation d'une seule propriété.
- Mémoire de conversation: si "Recent conversation" est fourni, traite les suivis (ça / là / compare / et pour les condos) comme la suite du même fil — réutilise le quartier et les chiffres déjà donnés.
- N'invente pas de prix. Tu peux indiquer une période (ex. "début 2026") sans citer de site.
- Aperçu préliminaire, sous réserve de révision par Ashkan Shamloo.
- Réponds en français (Québec).`
      : `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).
You answer like a clear, friendly real-estate advisor.

Formatting (required):
- Plain text only. No Markdown: no # headings, no **bold**, no __, no - bullet markdown, no | tables, no code fences.
- Short sentences and airy paragraphs with blank lines.
- Typical structure: 1) direct answer with the number, 2) brief market context, 3) one Ashkan review disclaimer line.
- Never use markdown headings or markdown tables.
- NO visible references: no URLs, no Sources/References lists, no "according to HonestDoor / Centris / Equipe AJ…", no markdown citations. Use preferred portals only internally to find the numbers.

Content and search:
- Use web_search for neighbourhood averages / medians and city context.
- Preferred sources (search these first, silently): HonestDoor, Centris, Equipe AJ (equipeaj.ca), OpenHouse QC (openhouseqc.com), HousingPortal (housingportal.ca), realtor.ca, Quebec Association of Real Estate Brokers (QAREB / APCIQ), JLR. Prefer portal / neighbourhood reports over random blogs or SEO articles.
- Run multiple focused searches when useful: neighbourhood single-family average/median; days on market / percent of list price; Montreal or borough context.
- Search queries should include neighbourhood + city + "average home price" / "median sold" / "unifamiliale" / "single-family" and the year when relevant (e.g. "Saint-Léonard Montreal Centris average single-family", "Saint-Léonard OpenHouse", "Anjou Saint-Léonard HousingPortal").
- If several figures appear, lead with the best neighbourhood-specific average/median from a preferred portal; mention Montreal city-wide only as secondary context.
- For a specific property question (address + beds/baths/features): 1) neighbourhood single-family average/median, 2) short Montreal / borough context, 3) a preliminary CAD range adjusted for features (finished basement, garage, condition) only when web stats support it, 4) Ashkan disclaimer — do not name websites.
- If relevant Estate Valora listings are provided, you may use them silently; do not present them as "references".
- If no PDF comps are useful: DO NOT say so. Just give the market answer. Never mention "PDF", "excerpts", "knowledge base", "no comps", or "not provided".
- Distinguish neighbourhood average vs a single-property estimate.
- Conversation memory: when "Recent conversation" is present, treat follow-ups (that / there / compare / and for condos) as the same thread — reuse the neighbourhood and figures already given; do not answer as if the prior turn never happened.
- Do not invent prices. You may mention a time period (e.g. "early 2026") without naming a site.
- Preliminary insight, subject to review by Ashkan Shamloo.
- Reply in English.`;

  const preferredSources =
    "HonestDoor, Centris, Equipe AJ (equipeaj.ca), OpenHouse QC (openhouseqc.com), HousingPortal (housingportal.ca), realtor.ca, APCIQ/QAREB, JLR";

  const input = `${system}

Internal reference material (use silently if helpful; never tell the user it was missing):
${args.compsContext}
${historyBlock}
Latest user message:
${args.message}

Instructions for this turn:
- If this is a follow-up to Recent conversation, answer in that context first (same area / numbers). Only web_search when you need fresh or compared figures.
- If they ask for an average / market price in a neighbourhood (e.g. Saint-Léonard, Fontainebleau, Blainville), run web_search targeting ${preferredSources} for that neighbourhood first, then lead with that average in plain text.
- If they describe a specific home (address and features), search those same preferred sources for neighbourhood single-family stats, then give a cautious preliminary CAD range only when the web figures support it. Keep it concise and user-friendly.`;

  const models = [...new Set([model, "gpt-4o"].filter(Boolean))];

  try {
    for (const tryModel of models) {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: tryModel,
          tools: [{ type: "web_search" }],
          tool_choice: "auto",
          input,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        console.error(
          `Chat web_search failed (${tryModel}):`,
          res.status,
          JSON.stringify(payload)?.slice(0, 500)
        );
        continue;
      }

      const text = extractOutputText(payload);
      if (!text) {
        console.error(`Chat web_search empty text (${tryModel})`);
        continue;
      }

      return {
        text,
        via: "web_search",
        sources: extractSources(payload),
      };
    }

    return { text: "", via: "failed", sources: [] };
  } catch (err) {
    console.error("Chat web_search error:", err);
    return { text: "", via: "failed", sources: [] };
  }
}
