/**
 * Public property-fact lookup via OpenAI Responses + web_search.
 * Prefer Quebec / Montréal assessment-roll style sources.
 */

export type PropertyFacts = {
  propertyType?: string;
  yearBuilt?: string;
  livingArea?: string;
  livingAreaUnit?: "Square feet" | "Square metres";
  lotSize?: string;
  municipalAssessment?: string;
  numberOfFloors?: string;
  confidence?: "low" | "medium" | "high";
  notes?: string;
};

export type PropertyFactsResult = {
  facts: PropertyFacts | null;
  via: "web_search" | "skipped" | "failed";
  query: string;
  sources?: string[];
};

const ESTATE_TYPES = [
  "Single-family home",
  "Townhouse",
  "Condo",
  "Duplex",
  "Triplex",
  "Fourplex",
  "Multi-unit / income property",
  "Other",
] as const;

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

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] || text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function str(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function mapPropertyType(raw: unknown): string | undefined {
  const s = str(raw);
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (ESTATE_TYPES.includes(s as (typeof ESTATE_TYPES)[number])) return s;
  if (
    /\bcondo|copropri[eé]t[eé]|appartement|apartment\b/i.test(lower)
  ) {
    return "Condo";
  }
  if (/\btownhouse|en rang[eé]e|row house\b/i.test(lower)) {
    return "Townhouse";
  }
  if (/\bduplex\b/i.test(lower)) return "Duplex";
  if (/\btriplex\b/i.test(lower)) return "Triplex";
  if (/\bfourplex|quadruplex\b/i.test(lower)) return "Fourplex";
  if (/\bplex|multi[- ]?unit|revenu|income\b/i.test(lower)) {
    return "Multi-unit / income property";
  }
  if (
    /\bmaison|house|detached|unifamiliale|single[- ]family\b/i.test(lower)
  ) {
    return "Single-family home";
  }
  return undefined;
}

function mapLivingAreaUnit(
  raw: unknown
): "Square feet" | "Square metres" | undefined {
  const s = str(raw)?.toLowerCase();
  if (!s) return undefined;
  if (
    s.includes("metre") ||
    s.includes("meter") ||
    s === "m2" ||
    s === "m²" ||
    s.includes("square metre")
  ) {
    return "Square metres";
  }
  if (s.includes("feet") || s.includes("foot") || s.includes("sq ft") || s === "sqft") {
    return "Square feet";
  }
  return undefined;
}

function normalizeFacts(obj: Record<string, unknown> | null): PropertyFacts | null {
  if (!obj) return null;
  const facts: PropertyFacts = {};
  const propertyType = mapPropertyType(obj.propertyType ?? obj.property_type);
  if (propertyType) facts.propertyType = propertyType;

  const yearBuilt = str(obj.yearBuilt ?? obj.year_built ?? obj.anneeConstruction);
  if (yearBuilt && /^\d{4}$/.test(yearBuilt)) facts.yearBuilt = yearBuilt;

  const livingArea = str(obj.livingArea ?? obj.living_area ?? obj.superficieBatiment);
  if (livingArea) {
    const digits = livingArea.replace(/,/g, "").match(/\d+(\.\d+)?/);
    if (digits) facts.livingArea = digits[0];
  }
  const unit = mapLivingAreaUnit(
    obj.livingAreaUnit ?? obj.living_area_unit ?? obj.areaUnit
  );
  if (unit) facts.livingAreaUnit = unit;
  else if (facts.livingArea && /m²|m2|metre/i.test(livingArea || "")) {
    facts.livingAreaUnit = "Square metres";
  } else if (facts.livingArea) {
    facts.livingAreaUnit = "Square feet";
  }

  const lotSize = str(obj.lotSize ?? obj.lot_size ?? obj.superficieTerrain);
  if (lotSize) facts.lotSize = lotSize;

  const assessment = str(
    obj.municipalAssessment ??
      obj.municipal_assessment ??
      obj.evaluationMunicipale ??
      obj.assessment
  );
  if (assessment) facts.municipalAssessment = assessment;

  const floors = str(obj.numberOfFloors ?? obj.floors ?? obj.etages);
  if (floors) facts.numberOfFloors = floors.replace(/[^\d.]/g, "") || floors;

  const conf = str(obj.confidence)?.toLowerCase();
  if (conf === "low" || conf === "medium" || conf === "high") {
    facts.confidence = conf;
  }
  const notes = str(obj.notes);
  if (notes) facts.notes = notes;

  const keys = Object.keys(facts).filter((k) => k !== "confidence" && k !== "notes");
  return keys.length > 0 ? facts : null;
}

export function isPropertyLookupEnabled(): boolean {
  if (process.env.PROPERTY_LOOKUP_WEB_SEARCH === "false") return false;
  if (process.env.PROPERTY_LOOKUP_WEB_SEARCH === "true") return true;
  // Default on when valuation web search is not explicitly off
  return process.env.VALUATION_WEB_SEARCH !== "false";
}

export function buildPropertyLookupQuery(args: {
  streetAddress: string;
  city?: string;
  postalCode?: string;
}): string {
  const location = [args.streetAddress, args.city, args.postalCode, "Quebec", "Canada"]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  return location;
}

/**
 * Look up public property characteristics for a civic address.
 */
export async function fetchPropertyFacts(args: {
  streetAddress: string;
  city?: string;
  postalCode?: string;
  locale?: "en" | "fr";
}): Promise<PropertyFactsResult> {
  const query = buildPropertyLookupQuery(args);
  if (!args.streetAddress?.trim()) {
    return { facts: null, via: "failed", query };
  }
  if (!isPropertyLookupEnabled()) {
    return { facts: null, via: "skipped", query };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { facts: null, via: "failed", query };
  }

  const model =
    process.env.OPENAI_MARKET_MODEL ||
    process.env.OPENAI_CHAT_MODEL ||
    process.env.OPENAI_VALUATION_MODEL ||
    "gpt-4o";

  const input = `You are a Quebec (Canada) property records researcher for Estate Valora.
Use web_search to find PUBLIC facts for this civic address only:
${query}

Preferred sources (search these first):
- Ville de Montréal rôle d'évaluation foncière / evaluation fonciere
- Données Québec / municipal assessment roll summaries
- Official municipal property assessment pages in Quebec
- realtor.ca public listing facts only if assessment data is missing

Return ONLY a JSON object (no markdown) with these optional keys when found:
{
  "propertyType": one of ${JSON.stringify(ESTATE_TYPES)},
  "yearBuilt": "YYYY",
  "livingArea": "number only",
  "livingAreaUnit": "Square feet" or "Square metres",
  "lotSize": "free text including unit e.g. 450 m² or 5000 sq ft",
  "municipalAssessment": "CAD amount as text e.g. 612000",
  "numberOfFloors": "number",
  "confidence": "low" | "medium" | "high",
  "notes": "short note on source/period"
}

Rules:
- Do not invent values. Omit keys you cannot verify.
- Prefer municipal assessment / rôle data over listing marketing copy.
- If multiple matches, pick the best address match and lower confidence.
- Reply with JSON only.`;

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
        input,
      }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(
        "Property lookup failed:",
        res.status,
        JSON.stringify(payload)?.slice(0, 500)
      );
      return { facts: null, via: "failed", query };
    }

    const text = extractOutputText(payload);
    const facts = normalizeFacts(extractJsonObject(text));
    if (!facts) {
      return {
        facts: null,
        via: "failed",
        query,
        sources: extractSources(payload),
      };
    }

    return {
      facts,
      via: "web_search",
      query,
      sources: extractSources(payload),
    };
  } catch (err) {
    console.error("Property lookup error:", err);
    return { facts: null, via: "failed", query };
  }
}
