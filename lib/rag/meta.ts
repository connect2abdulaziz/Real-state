/**
 * Knowledge-base helpers for Estate Valora RAG chat.
 */

export type CompPropertyType = "condo" | "single_family" | "other";
export type CompStatus = "sold" | "listing" | "unknown";

export type CompMeta = {
  property_type: CompPropertyType;
  status: CompStatus;
  region: string | null;
  source_file: string;
  title: string;
};

const REGION_PATTERNS: Array<[RegExp, string]> = [
  [/laurentides?/i, "Laurentides"],
  [/south\s*shore|rive[-\s]?sud/i, "South Shore"],
  [/laval/i, "Laval"],
  [/montr[eé]al|montreal/i, "Montreal"],
  [/blainville/i, "Blainville"],
  [/longueuil/i, "Longueuil"],
];

export function inferMetaFromPath(filePath: string): CompMeta {
  const normalized = filePath.replace(/\\/g, "/");
  const base = normalized.split("/").pop() || normalized;
  const title = base.replace(/\.pdf$/i, "").trim();
  const lower = normalized.toLowerCase();

  let property_type: CompPropertyType = "other";
  if (/condo/.test(lower)) property_type = "condo";
  else if (/single|house|family/.test(lower)) property_type = "single_family";

  let status: CompStatus = "unknown";
  if (/\bsold\b/.test(lower)) status = "sold";
  else if (/on\s*the\s*market|on\s*market|listing/.test(lower)) {
    status = "listing";
  }

  let region: string | null = null;
  for (const [re, label] of REGION_PATTERNS) {
    if (re.test(normalized) || re.test(title)) {
      region = label;
      break;
    }
  }

  return {
    property_type,
    status,
    region,
    source_file: normalized,
    title,
  };
}

/** Detect soft filters from a user question for RAG retrieval. */
export function inferQueryFilters(message: string): {
  property_type?: CompPropertyType;
  status?: CompStatus;
  region?: string;
} {
  const lower = message.toLowerCase();
  const out: {
    property_type?: CompPropertyType;
    status?: CompStatus;
    region?: string;
  } = {};

  if (/\b(condo|condos|condominium|appartement|appartements)\b/.test(lower)) {
    out.property_type = "condo";
  } else if (
    /\b(houses?|homes?|single[-\s]?family|maisons?|unifamiliale|detached)\b/.test(
      lower
    )
  ) {
    out.property_type = "single_family";
  }

  if (
    /\b(sold|vendu|vendus|vendue|vendues)\b|\bsale\s+price\b|\bprix\s+de\s+vente\b/.test(
      lower
    )
  ) {
    out.status = "sold";
  } else if (
    /\blisting|on\s+the\s+market|for\s+sale|en\s+vente|sur\s+le\s+march/.test(
      lower
    )
  ) {
    out.status = "listing";
  }

  for (const [re, label] of REGION_PATTERNS) {
    if (re.test(message)) {
      out.region = label;
      break;
    }
  }

  return out;
}

/**
 * Split text into overlapping character chunks (approx token-friendly size).
 */
export function chunkText(
  text: string,
  opts?: { maxChars?: number; overlap?: number }
): string[] {
  const maxChars = opts?.maxChars ?? 2800;
  const overlap = opts?.overlap ?? 350;
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("\n")
      );
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt + 1;
      }
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}
