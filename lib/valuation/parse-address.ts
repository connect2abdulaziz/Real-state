/**
 * Parse Canadian (esp. Québec) address strings so we can skip city / postal
 * questions when the user already provided them in one message.
 */

const POSTAL_RE =
  /\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/;

const PROVINCE_TOKENS = new Set([
  "qc",
  "quebec",
  "québec",
  "pq",
  "on",
  "ontario",
  "bc",
  "ab",
  "alberta",
  "mb",
  "sk",
  "ns",
  "nb",
  "nl",
  "pe",
  "yt",
  "nt",
  "nu",
  "canada",
  "ca",
]);

/** Street-like token: number + road type (EN/FR). */
const STREET_CHUNK_RE =
  /(\d{1,6}\s+(?:rue|avenue|ave\.?|boulevard|boul\.?|blvd\.?|chemin|ch\.?|route|rang|street|st\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|court|crt\.?|place|plaza|way|crescent|cres\.?)\s+[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s''.-]{1,60})/i;

export type ParsedAddress = {
  street: string;
  city?: string;
  postalCode?: string;
  /** True when city and postal were both present in the input. */
  complete: boolean;
};

function formatPostal(fsa: string, ldu: string): string {
  const compact = `${fsa}${ldu}`.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compact.length !== 6) return `${fsa} ${ldu}`.toUpperCase();
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

function stripProvince(segment: string): string {
  const tokens = segment.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";
  while (
    tokens.length > 0 &&
    PROVINCE_TOKENS.has(tokens[tokens.length - 1].toLowerCase())
  ) {
    tokens.pop();
  }
  return tokens.join(" ").trim();
}

/** Avoid splitting "2,000" / "5,000" into fake address parts. */
function protectThousands(input: string): string {
  return input.replace(/(\d),(\d{3})\b/g, "$1$2");
}

function looksLikeCity(segment: string): boolean {
  const s = segment.trim();
  if (!s || s.length > 48) return false;
  if (/@|phone|email|http|bedroom|bathroom|built|renovat|parking|garage|basement|lot|sq\.?\s*ft|square\s*feet/i.test(s)) {
    return false;
  }
  if (/^\d+$/.test(s)) return false;
  // Prefer title-ish place names (allow accents)
  return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s''.-]{1,40}$/.test(s);
}

function extractStreet(text: string): string | undefined {
  const m = text.match(STREET_CHUNK_RE);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, " ").replace(/[.,;:]+$/, "").trim();
}

/**
 * Pull a short address-looking window out of a long ChatGPT-style paragraph.
 */
function addressWindow(raw: string): string {
  const postalMatch = raw.match(POSTAL_RE);
  const streetMatch = raw.match(STREET_CHUNK_RE);

  if (postalMatch?.index != null && streetMatch?.index != null) {
    const start = Math.min(streetMatch.index, postalMatch.index);
    const end = Math.max(
      postalMatch.index + postalMatch[0].length,
      streetMatch.index + streetMatch[0].length
    );
    // Include a little context before street for "at …"
    return raw.slice(Math.max(0, start - 12), Math.min(raw.length, end + 24));
  }

  if (streetMatch?.index != null) {
    return raw.slice(
      streetMatch.index,
      Math.min(raw.length, streetMatch.index + streetMatch[0].length + 80)
    );
  }

  if (postalMatch?.index != null) {
    return raw.slice(
      Math.max(0, postalMatch.index - 80),
      postalMatch.index + postalMatch[0].length
    );
  }

  // Short inputs are already address-only
  if (raw.length <= 120) return raw;
  return raw.slice(0, 160);
}

/**
 * Extract street / city / postal from free-text like:
 * - "28 rue de Josselin, Blainville, J7B 1X9"
 * - "28 rue de Josselin, Blainville QC J7B1X9"
 * - long paragraph containing an address
 * - "28 rue de Josselin" (street only)
 */
export function parseCanadianAddress(input: string): ParsedAddress {
  const rawFull = input.replace(/\s+/g, " ").trim();
  if (!rawFull) return { street: "", complete: false };

  const raw = protectThousands(addressWindow(rawFull));

  let postalCode: string | undefined;
  let withoutPostal = raw;

  const postalMatch = raw.match(POSTAL_RE);
  if (postalMatch) {
    postalCode = formatPostal(postalMatch[1], postalMatch[2]);
    withoutPostal = raw
      .replace(postalMatch[0], " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/\s+/g, " ")
      .replace(/^[\s,]+|[\s,]+$/g, "")
      .trim();
  }

  const streetFromPattern = extractStreet(withoutPostal) || extractStreet(rawFull);

  const parts = withoutPostal
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let city: string | undefined;

  // Prefer city token immediately before province / after street
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const lower = p.toLowerCase();
    if (PROVINCE_TOKENS.has(lower)) {
      if (i > 0 && looksLikeCity(parts[i - 1])) {
        city = stripProvince(parts[i - 1]);
        break;
      }
    }
  }

  if (!city) {
    for (const p of parts) {
      const cleaned = stripProvince(p);
      if (cleaned && looksLikeCity(cleaned) && cleaned !== streetFromPattern) {
        // Skip if this segment is the street line
        if (streetFromPattern && cleaned.includes(streetFromPattern.slice(0, 12))) {
          continue;
        }
        if (/^\d+\s+/.test(cleaned)) continue;
        city = cleaned;
        // Prefer later city-like tokens near the end (Blainville over noise)
      }
    }
  }

  // "Blainville Quebec" without comma between city and province
  if (!city) {
    const cityProv = withoutPostal.match(
      /\b([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ''.-]+(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ''.-]+){0,2})\s+(?:QC|Quebec|Québec|Ontario|ON)\b/i
    );
    if (cityProv && looksLikeCity(cityProv[1])) {
      city = cityProv[1].trim();
    }
  }

  const street =
    streetFromPattern ||
    (parts[0] && /^\d+\s+/.test(parts[0]) ? parts[0] : undefined) ||
    (rawFull.length <= 80 ? withoutPostal || rawFull : "");

  return {
    street: street || "",
    city: city || undefined,
    postalCode,
    complete: Boolean(city && postalCode),
  };
}

export type AddressSuggestion = {
  city: string;
  postalCode?: string;
  displayName: string;
};

/** Build confirmation copy for a geocoded suggestion. */
export function addressConfirmAsk(
  city: string,
  postalCode: string | undefined,
  locale: "en" | "fr"
): string {
  const place = postalCode ? `${city}, ${postalCode}` : city;
  return locale === "fr"
    ? `Est-ce bien à ${place}?`
    : `Is this in ${place}?`;
}

export function addressCapturedNote(
  city: string,
  postalCode: string | undefined,
  locale: "en" | "fr"
): string {
  const place = postalCode ? `${city}, ${postalCode}` : city;
  return locale === "fr"
    ? `Parfait — j'ai noté ${place}.`
    : `Got it — I've noted ${place}.`;
}
