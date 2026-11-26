/**
 * Option 2 for /chat: OpenAI Responses API + web_search
 * so neighbourhood averages (HonestDoor, etc.) can be found like ChatGPT.
 */

import {
  resolveChatModelFromEnv,
  resolveChatSearchModeFromEnv,
} from "@/lib/openai/defaults";

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
  // Explicit chat flag, else valuation flag, else ON (code default)
  if (process.env.CHAT_WEB_SEARCH === "false") return false;
  if (process.env.CHAT_WEB_SEARCH === "true") return true;
  if (process.env.VALUATION_WEB_SEARCH === "false") return false;
  if (process.env.VALUATION_WEB_SEARCH === "true") return true;
  return true;
}

/**
 * open = ChatGPT-style: search the whole web (default when env unset).
 * preferred = bias toward client portals (HonestDoor, Centris, etc.).
 */
export function resolveChatSearchMode(): "open" | "preferred" {
  return resolveChatSearchModeFromEnv();
}

/** Chat / web_search model — falls back to code default if Vercel env missing. */
export function resolveChatModel(): string {
  return resolveChatModelFromEnv();
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

  const noSourcesRuleFr = `RÈGLE ABSOLUE — JAMAIS de sources dans la réponse:
- N'écris AUCUN nom de site, domaine, URL, courtier-web, portail (ex. HonestDoor, Centris, Remax, *.ca, *.com).
- PAS de parenthèses du type (loaamanseur-remax.ca) ou (centris.ca).
- PAS de "selon…", "d'après…", "basé sur…", "Sources:", "Références:".
- Cherche sur le web en silence; donne seulement les chiffres + contexte + période/lieu si connu.`;

  const noSourcesRuleEn = `ABSOLUTE RULE — NEVER show sources in the reply:
- Do NOT write any website name, domain, URL, broker site, or portal (e.g. HonestDoor, Centris, Remax, *.ca, *.com).
- NO parentheses like (loaamanseur-remax.ca) or (centris.ca).
- NO "according to…", "based on…", "per…", "Sources:", "References:".
- Search the web silently; output only numbers + context + place/period when known.`;

  const searchRulesFr = openSearch
    ? `- Utilise web_search librement sur tout le web public (comme ChatGPT), pour toute question utile — marché immobilier, quartier, tendances, contexte.
- Tu n'es PAS limité à une liste de sites. Cherche ce qui est le plus récent et crédible — mais NE NOMME JAMAIS les sites dans la réponse.
- Pour les prix: privilégie des chiffres avec lieu + période; si les sources divergent, dis-le brièvement SANS nommer de site.
- Fais plusieurs recherches ciblées si utile (quartier, type de propriété, année).`
    : `- Utilise web_search pour moyennes / médianes de quartier et contexte ville.
- En interne seulement, privilégie: ${PREFERRED_PORTALS}. NE les cite JAMAIS dans la réponse utilisateur.
- Les requêtes doivent inclure quartier + ville + "prix moyen" / "médiane vendue" / "unifamiliale" et l'année si pertinent.
- S'il y a plusieurs chiffres, mène avec la meilleure moyenne/médiane de quartier; Montréal en secondaire — sans nommer de site.`;

  const searchRulesEn = openSearch
    ? `- Use web_search freely across the public web (ChatGPT-style) for any useful question — market, neighbourhood, trends, context.
- You are NOT limited to a fixed list of websites. Prefer recent credible results — but NEVER name those sites in the user-facing reply.
- For prices: prefer figures that name place + time period; if figures disagree, say so briefly WITHOUT naming a site.
- Run multiple focused searches when useful (neighbourhood, property type, year).`
    : `- Use web_search for neighbourhood averages / medians and city context.
- Internally prefer: ${PREFERRED_PORTALS}. NEVER cite them in the user-facing reply.
- Search queries should include neighbourhood + city + "average home price" / "median sold" / "single-family" and the year when relevant.
- If several figures appear, lead with the best neighbourhood average/median; Montreal secondary — without naming any site.`;

  const system =
    args.locale === "fr"
      ? `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).
Réponds comme ChatGPT: propre, scannable, pas un long essai.

${noSourcesRuleFr}

Mise en forme (comme ChatGPT — obligatoire):
- Utilise **gras** pour les chiffres clés et libellés courts (ex. **865 520 $ CAD**).
- Sépare les blocs avec une ligne dividere seule: ---
- Tu peux utiliser de courtes puces • (une idée par ligne).
- Structure typique:
  **Réponse**
  une ligne avec le chiffre
  ---
  1–2 phrases de contexte
  ---
  une courte note Ashkan (seulement si estimation)
- Court: en général 2–4 petits blocs. Pas de roman. Pas de tableaux. Pas de # titres.

Recherche:
${searchRulesFr}
- Propriété précise: fourchette CAD courte si les stats le supportent.
- Listings Estate Valora: silencieux. Jamais PDF / knowledge base.
- Mémoire: suis "Recent conversation".
- N'invente pas de prix. Réponds en français (Québec).`
      : `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).
Answer like ChatGPT: clean and scannable — not a long essay.

${noSourcesRuleEn}

Formatting (ChatGPT-style — required):
- Use **bold** for key numbers and short labels (e.g. **$865,520 CAD**).
- Separate sections with a single divider line: ---
- You may use short • bullets (one idea per line).
- Typical structure:
  **Answer**
  one line with the figure
  ---
  1–2 short context sentences
  ---
  one short Ashkan note (only when giving an estimate)
- Keep it tight: usually 2–4 small blocks. No essays. No tables. No # headings.

Search:
${searchRulesEn}
- Specific property: short CAD range only if stats support it.
- Estate Valora listings: silent. Never PDF / knowledge base.
- Memory: use "Recent conversation".
- Do not invent prices. Reply in English.`;

  const turnSearchHint = openSearch
    ? `- Search the open web as needed. Prefer recent neighbourhood-specific figures for price questions.
- Specific home → local stats, then a short preliminary CAD range if supported.`
    : `- Neighbourhood average → web_search (preferred portals internally only; never name them).
- Specific home → same, then a short preliminary CAD range if supported.`;

  const input = `${system}

Internal reference material (use silently if helpful; never tell the user it was missing):
${args.compsContext}
${historyBlock}
Latest user message:
${args.message}

This turn:
- Follow-ups: stay in the same thread context. Search only if you need fresh/compared figures.
${turnSearchHint}
- Format like ChatGPT: **bold** key numbers, --- dividers, short blocks. Search mode: ${searchMode}.
- CRITICAL: Do not include any website name, domain, URL, or "(site.ca)" citation in your reply.`;

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
