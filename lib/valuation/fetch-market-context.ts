import type { PropertyRecord } from "@/lib/types";

/**
 * Builds a focused web-search query for neighbourhood / city market context.
 * Prefer city + neighbourhood cues from the address over vague province-wide asks.
 */
export function buildMarketSearchQuery(property: PropertyRecord): string {
  const details = (property.details || {}) as Record<string, unknown>;
  const city =
    (typeof details.city === "string" && details.city.trim()) ||
    extractCityFromAddress(property.address);
  const postal =
    (typeof details.postalCode === "string" && details.postalCode.trim()) ||
    extractPostalFromAddress(property.address);
  const type = property.property_type || "house";
  const location =
    [city, postal ? `postal ${postal}` : null, "Quebec", "Canada"]
      .filter(Boolean)
      .join(", ") ||
    property.address ||
    "Montreal, Quebec";

  return [
    `Current average selling price and recent market data for ${type} properties in ${location}.`,
    "Prefer recent Canadian / Quebec sources (HonestDoor, Centris summaries, realtor.ca, local market reports).",
    "Include neighbourhood average if available, and note the date of the figures.",
    "Reply with a short factual market brief (numbers in CAD) and cite source names/URLs.",
  ].join(" ");
}

function extractCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  // "street, City, J7B 1X9" or "street, City"
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
  const enabled = process.env.VALUATION_WEB_SEARCH !== "false";
  if (!enabled) {
    return {
      text: "",
      query: "",
      via: "skipped",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: "", query: "", via: "failed" };
  }

  const query = buildMarketSearchQuery(property);
  const model =
    process.env.OPENAI_MARKET_MODEL ||
    process.env.OPENAI_VALUATION_MODEL ||
    "gpt-4o";

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
Use web search to find recent average sale prices / market reports for the requested area.
Return a concise market brief in English:
- Neighbourhood or city average sale price for the property type (CAD)
- Date / period of the figures if available
- 2–4 short bullets of market context
- Source names and URLs
Do not invent MLS listing addresses or fake sold comps. If data is thin, say so clearly.

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
      return { text: "", query, via: "failed" };
    }

    const text = extractOutputText(payload);
    if (!text) {
      console.error("Market web search returned empty text");
      return { text: "", query, via: "failed" };
    }

    const sources = extractSources(payload);
    const withSources =
      sources.length > 0
        ? `${text}\n\nSources:\n${sources.map((u) => `- ${u}`).join("\n")}`
        : text;

    return {
      text: withSources,
      query,
      via: "web_search",
      sources,
    };
  } catch (err) {
    console.error("Market web search error:", err);
    return { text: "", query, via: "failed" };
  }
}
