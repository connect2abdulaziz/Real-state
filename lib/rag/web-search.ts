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
      : `\nRecent conversation:\n${args.history
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")}\n`;

  const system =
    args.locale === "fr"
      ? `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).
Tu réponds comme un conseiller immobilier clair et chaleureux.

Format (obligatoire):
- Texte simple uniquement. Pas de Markdown: pas de #, **, __, listes -, tableaux |, ni blocs de code.
- Phrases courtes, paragraphes aérés (sauts de ligne).
- Structure typique: 1) réponse directe avec le chiffre, 2) court contexte, 3) une phrase de réserve Ashkan.
- N'utilise jamais de titres markdown ni de tableaux.

Contenu:
- Utilise web_search pour moyennes de quartier / ville (HonestDoor, Centris, realtor.ca, rapports QC).
- Si des listings Estate Valora pertinents sont fournis, tu peux les citer brièvement comme exemples.
- Si aucun comparable PDF n'est utile: NE LE DIS PAS. Donne simplement la réponse marché. Ne mentionne jamais "PDF", "extraits", "knowledge base", "comps manquants" ou "non fourni".
- Distingue moyenne de quartier vs prix d'une seule propriété.
- N'invente pas de prix. Mentionne la source en langage naturel (ex. "selon HonestDoor, août 2026").
- Aperçu préliminaire, sous réserve de révision par Ashkan Shamloo.
- Réponds en français (Québec).`
      : `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).
You answer like a clear, friendly real-estate advisor.

Formatting (required):
- Plain text only. No Markdown: no # headings, no **bold**, no __, no - bullet markdown, no | tables, no code fences.
- Short sentences and airy paragraphs with blank lines.
- Typical structure: 1) direct answer with the number, 2) brief context, 3) one Ashkan review disclaimer line.
- Never use markdown headings or markdown tables.

Content:
- Use web_search for neighbourhood / city averages (HonestDoor, Centris, realtor.ca, Quebec reports).
- If relevant Estate Valora listings are provided, you may briefly cite them as examples.
- If no PDF comps are useful: DO NOT say so. Just give the market answer. Never mention "PDF", "excerpts", "knowledge base", "no comps", or "not provided".
- Distinguish neighbourhood average vs a single listing price.
- Do not invent prices. Name sources in plain language (e.g. "according to HonestDoor, August 2026").
- Preliminary insight, subject to review by Ashkan Shamloo.
- Reply in English.`;

  const input = `${system}

Internal reference material (use silently if helpful; never tell the user it was missing):
${args.compsContext}
${historyBlock}
User question:
${args.message}

If they ask for an average / market price in a neighbourhood (e.g. Fontainebleau, Blainville), search the web and lead with that average in plain text. Keep it concise and user-friendly.`;

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
