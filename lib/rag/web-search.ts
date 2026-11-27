/**
 * Option 2 for /chat: OpenAI Responses API + web_search
 * so neighbourhood averages (HonestDoor, etc.) can be found like ChatGPT.
 */

import {
  resolveChatModelFromEnv,
  resolveChatSearchModeFromEnv,
} from "@/lib/openai/defaults";
import {
  buildChatSystemPromptParts,
  type ChatIntakeState,
} from "@/lib/rag/chat-intake";

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
  intake: ChatIntakeState;
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

  const { system, turnHint } = buildChatSystemPromptParts({
    locale: args.locale,
    openSearch,
    preferredPortals: PREFERRED_PORTALS,
    intake: args.intake,
  });

  const input = `${system}

Internal reference material (use silently if helpful; never tell the user it was missing):
${args.compsContext}

Intake state (authoritative — do not re-ask Known facts):
${args.intake.stateBlock}
${historyBlock}
Latest user message:
${args.message}

This turn:
- Follow-ups: stay in the same thread context. Search only if you need fresh/compared figures.
${turnHint}
- Format: **bold** key numbers when giving figures; --- only when useful. Search mode: ${searchMode}.
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
