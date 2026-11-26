import type { PropertyRecord } from "@/lib/types";
import { resolveMarketModelFromEnv } from "@/lib/openai/defaults";
import {
  VALUATION_PREFERRED_SOURCES,
  marketBriefHasGeoAndPeriod,
  marketTypeLabel,
} from "@/lib/valuation/data-quality";

/**
 * Builds a focused web-search query for neighbourhood / city market context.
 * Prefer city + neighbourhood cues; keep property type family distinct.
 */
export function buildMarketSearchQuery(property: PropertyRecord): string {
  const details = (property.details || {}) as Record<string, unknown>;
  const city =
    (typeof details.city === "string" && details.city.trim()) ||
    extractCityFromAddress(property.address);
  const postal =
    (typeof details.postalCode === "string" && details.postalCode.trim()) ||
    extractPostalFromAddress(property.address);
  const typeLabel = marketTypeLabel(property.property_type);
  const location =
    [city, postal ? `postal ${postal}` : null, "Quebec", "Canada"]
      .filter(Boolean)
      .join(", ") ||
    property.address ||
    "Montreal, Quebec";

  const preferred = VALUATION_PREFERRED_SOURCES.join(", ");

  return [
    `Average / median sold price for ${typeLabel} properties in ${location}.`,
    `Do NOT mix with other property types (e.g. do not use condo stats for a single-family, or vice versa).`,
    `Prefer these sources first: ${preferred}.`,
    `Every figure must state the geography (neighbourhood/city) AND the time period (month/quarter/year).`,
    `If only city-wide or older data exists, say so and flag uncertainty — do not invent prices.`,
    `Reply with a short factual market brief (numbers in CAD).`,
  ].join(" ");
}

function extractCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[1].replace(/\b[A-Za-z]\d[A-Za-z].*$/, "").trim();
    return candidate || parts[1];
  }
  return null;
}

function extractPostalFromAddress(address: string | null): string | null {
  if (!address) return null;
  const m = address.match(/\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/);
  if (!m) return null;
  return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`;
}

export type MarketContextResult = {
  text: string;
  query: string;
  via: "web_search" | "skipped" | "failed";
  sources?: string[];
  /** Heuristic: brief appears to include place + period for figures. */
  hasGeoPeriod?: boolean;
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

/**
 * Option 2: fetch live web market context via OpenAI Responses API + web_search.
 * Disabled when VALUATION_WEB_SEARCH=false. Failures return via:"failed" (valuation still runs).
 */
export async function fetchMarketContext(
  property: PropertyRecord
): Promise<MarketContextResult> {
  // Default ON when env unset (Vercel may not have the key yet)
  const enabled = process.env.VALUATION_WEB_SEARCH !== "false";
  if (!enabled) {
    return {
      text: "",
      query: "",
      via: "skipped",
      hasGeoPeriod: false,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: "", query: "", via: "failed", hasGeoPeriod: false };
  }

  const query = buildMarketSearchQuery(property);
  const typeLabel = marketTypeLabel(property.property_type);
  const preferred = VALUATION_PREFERRED_SOURCES.join(", ");
  const model = resolveMarketModelFromEnv();

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        input: `You are a Canadian residential market researcher for Estate Valora (Quebec focus).
Use web_search to find recent average/median sale prices for the SAME property type only: ${typeLabel}.

Preferred sources (search these first): ${preferred}.

Rules:
- Every price figure MUST name geography (neighbourhood and/or city) AND time period (month, quarter, or year).
- Never mix property types or reporting periods without saying so.
- If neighbourhood data is missing, use city-level and mark it as city-wide / lower confidence.
- If data is thin or conflicting, say so clearly — do not invent MLS listings or fake sold prices.
- Numbers in CAD.

Return a concise market brief in English:
1) Headline average/median for ${typeLabel} with place + period
2) 2–4 short context bullets
3) Uncertainty notes if any
4) Source names (URLs optional)

Research request:
${query}`,
      }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(
        "Market web search failed:",
        res.status,
        JSON.stringify(payload)?.slice(0, 500)
      );
      return { text: "", query, via: "failed", hasGeoPeriod: false };
    }

    const text = extractOutputText(payload);
    if (!text) {
      console.error("Market web search returned empty text");
      return { text: "", query, via: "failed", hasGeoPeriod: false };
    }

    const sources = extractSources(payload);
    const withSources =
      sources.length > 0
        ? `${text}\n\nSources:\n${sources.map((u) => `- ${u}`).join("\n")}`
        : text;
    const hasGeoPeriod = marketBriefHasGeoAndPeriod(withSources);

    return {
      text: withSources,
      query,
      via: "web_search",
      sources,
      hasGeoPeriod,
    };
  } catch (err) {
    console.error("Market web search error:", err);
    return { text: "", query, via: "failed", hasGeoPeriod: false };
  }
}
