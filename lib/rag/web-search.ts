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

/**
 * open = ChatGPT-style: search the whole web (default).
 * preferred = bias toward client portals (HonestDoor, Centris, etc.).
 */
export function resolveChatSearchMode(): "open" | "preferred" {
  const raw = (process.env.CHAT_SEARCH_MODE || "open").toLowerCase().trim();
  return raw === "preferred" ? "preferred" : "open";
}

/** Best generally available chat + tools model (override with OPENAI_CHAT_MODEL). */
export function resolveChatModel(): string {
  return (
    process.env.OPENAI_CHAT_MODEL ||
    process.env.OPENAI_MARKET_MODEL ||
    process.env.OPENAI_VALUATION_MODEL ||
    "gpt-6.1-terra"
  );
}

const PREFERRED_PORTALS =
  "HonestDoor, Centris, Equipe AJ (equipeaj.ca), OpenHouse QC (openhouseqc.com), HousingPortal (housingportal.ca), realtor.ca, APCIQ/QAREB, JLR";

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

  const searchMode = resolveChatSearchMode();
  const openSearch = searchMode === "open";

  const searchRulesFr = openSearch
    ? `- Utilise web_search librement sur tout le web public (comme ChatGPT), pour toute question utile — marché immobilier, quartier, tendances, contexte.
- Tu n'es PAS limité à une liste de sites. Cherche ce qui est le plus récent et crédible.
- Pour les prix: privilégie des chiffres avec lieu + période; si les sources divergent, dis-le brièvement et mène avec la meilleure estimation de quartier.
- Fais plusieurs recherches ciblées si utile (quartier, type de propriété, année).`
    : `- Utilise web_search pour moyennes / médianes de quartier et contexte ville.
- Sources préférées (cherche-les d'abord, en silence): ${PREFERRED_PORTALS}. Préfère les stats de portails / rapports de quartier aux blogues SEO.
- Les requêtes doivent inclure quartier + ville + "prix moyen" / "médiane vendue" / "unifamiliale" et l'année si pertinent.
- S'il y a plusieurs chiffres, mène avec la moyenne/médiane du quartier d'une source préférée; la moyenne Montréal n'est qu'un contexte secondaire.`;

  const searchRulesEn = openSearch
    ? `- Use web_search freely across the public web (ChatGPT-style) for any useful question — market, neighbourhood, trends, context.
- You are NOT limited to a fixed list of websites. Prefer the most recent, credible results.
- For prices: prefer figures that name place + time period; if sources disagree, say so briefly and lead with the best neighbourhood estimate.
- Run multiple focused searches when useful (neighbourhood, property type, year).`
    : `- Use web_search for neighbourhood averages / medians and city context.
- Preferred sources (search these first, silently): ${PREFERRED_PORTALS}. Prefer portal / neighbourhood reports over random blogs or SEO articles.
- Search queries should include neighbourhood + city + "average home price" / "median sold" / "single-family" and the year when relevant.
- If several figures appear, lead with the best neighbourhood-specific average/median from a preferred portal; Montreal city-wide only as secondary context.`;

  const system =
    args.locale === "fr"
      ? `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).
Réponds comme ChatGPT: naturel, direct, facile à lire — PAS comme un essai ou un rapport.

Style (obligatoire):
- Texte simple seulement. Pas de Markdown (#, **, listes -, tableaux).
- 1ère phrase = la réponse (chiffre ou conclusion). Puis 1–2 phrases de contexte max.
- Total: environ 3–6 phrases courtes, ou 2–3 tout petits paragraphes. Pas d'essai long.
- Pas de numérotation 1) 2) 3). Pas de titres. Pas de répétition du même point.
- Une seule courte phrase Ashkan à la fin SEULEMENT si tu donnes une estimation / fourchette (pas à chaque message).
- AUCUNE référence visible: pas d'URLs, pas de "Sources", pas de "selon …".

Recherche:
${searchRulesFr}
- Propriété précise: fourchette CAD courte si les stats le supportent.
- Listings Estate Valora: utilisation silencieuse. Ne parle jamais de PDF / knowledge base.
- Mémoire: suis "Recent conversation" pour les suivis.
- N'invente pas de prix. Réponds en français (Québec).`
      : `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).
Answer like ChatGPT: natural, direct, easy to scan — NOT like an essay or formal report.

Style (required):
- Plain text only. No Markdown (#, **, bullet lists, tables).
- First sentence = the answer (number or conclusion). Then at most 1–2 short context sentences.
- Keep it short: about 3–6 short sentences, or 2–3 tiny paragraphs. No long essays.
- No 1) 2) 3) numbering. No headings. Don't repeat the same point.
- One short Ashkan line at the end ONLY when you give an estimate / range (not on every reply).
- NO visible references: no URLs, no "Sources", no "according to …".

Search:
${searchRulesEn}
- Specific property: short CAD range only if stats support it.
- Estate Valora listings: use silently. Never mention PDF / knowledge base.
- Memory: use "Recent conversation" for follow-ups.
- Do not invent prices. Reply in English.`;

  const turnSearchHint = openSearch
    ? `- Search the open web as needed. Prefer recent neighbourhood-specific figures for price questions.
- Specific home → local stats, then a short preliminary CAD range if supported.`
    : `- Neighbourhood average → web_search targeting ${PREFERRED_PORTALS} first.
- Specific home → those preferred sources, then a short preliminary CAD range if supported.`;

  const input = `${system}

Internal reference material (use silently if helpful; never tell the user it was missing):
${args.compsContext}
${historyBlock}
Latest user message:
${args.message}

This turn:
- Follow-ups: stay in the same thread context. Search only if you need fresh/compared figures.
${turnSearchHint}
- Reply short and clear like ChatGPT (lead with the answer). Search mode: ${searchMode}.`;

  const models = [...new Set([model, "gpt-6.1-terra", "gpt-4o"].filter(Boolean))];

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
