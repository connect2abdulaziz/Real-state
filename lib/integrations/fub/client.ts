/**
 * Follow Up Boss HTTP client (SOW 7).
 * Auth: Basic — API key as username, empty password.
 * New leads must go through POST /v1/events (not /people) so automations fire.
 */

const FUB_BASE = "https://api.followupboss.com/v1";

export interface FubPersonInput {
  firstName?: string;
  lastName?: string;
  emails?: Array<{ value: string; type?: string }>;
  phones?: Array<{ value: string; type?: string }>;
  addresses?: Array<{
    type?: string;
    street?: string;
    city?: string;
    code?: string;
    country?: string;
  }>;
  tags?: string[];
  stage?: string;
  source?: string;
  notes?: string;
  // Custom fields (must exist in the FUB account to apply).
  customValuationLow?: number;
  customValuationHigh?: number;
  customValuationConfidence?: string;
  customMotivation?: string;
  customSellingTimeline?: string;
  customReportStatus?: string;
  customConsultationStatus?: string;
  customConsultationChannel?: string;
}

export interface FubEventPayload {
  source: string;
  system?: string;
  type: string;
  message?: string;
  person: FubPersonInput;
  property?: {
    street?: string;
    city?: string;
    code?: string;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    mlsNumber?: string;
    price?: number;
    forRent?: boolean;
    url?: string;
  };
}

export interface FubEventResult {
  ok: boolean;
  status: number;
  personId?: string | number | null;
  raw: unknown;
  error?: string;
}

function authHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${token}`;
}

export function isFubConfigured(): boolean {
  return Boolean(process.env.FOLLOW_UP_BOSS_API_KEY?.trim());
}

export async function postFubEvent(
  payload: FubEventPayload
): Promise<FubEventResult> {
  const apiKey = process.env.FOLLOW_UP_BOSS_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      raw: null,
      error: "FOLLOW_UP_BOSS_API_KEY is not set",
    };
  }

  const res = await fetch(`${FUB_BASE}/events`, {
    method: "POST",
    headers: {
      Authorization: authHeader(apiKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let raw: unknown = text;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      raw,
      error:
        typeof raw === "object" && raw && "errorMessage" in raw
          ? String((raw as { errorMessage: string }).errorMessage)
          : `FUB events HTTP ${res.status}`,
    };
  }

  const personId =
    typeof raw === "object" && raw && "id" in (raw as object)
      ? ((raw as { id?: string | number }).id ??
        (raw as { person?: { id?: string | number } }).person?.id ??
        null)
      : null;

  // FUB sometimes returns { person: { id } } or wraps differently
  const nestedPersonId =
    typeof raw === "object" &&
    raw &&
    "person" in raw &&
    typeof (raw as { person?: { id?: unknown } }).person?.id !== "undefined"
      ? (raw as { person: { id: string | number } }).person.id
      : personId;

  return {
    ok: true,
    status: res.status,
    personId: nestedPersonId ?? personId,
    raw,
  };
}

/**
 * Update an existing person (for consultation status / tags after first sync).
 */
export async function updateFubPerson(
  personId: string | number,
  body: Partial<FubPersonInput> & { notes?: string }
): Promise<FubEventResult> {
  const apiKey = process.env.FOLLOW_UP_BOSS_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      raw: null,
      error: "FOLLOW_UP_BOSS_API_KEY is not set",
    };
  }

  const res = await fetch(`${FUB_BASE}/people/${personId}`, {
    method: "PUT",
    headers: {
      Authorization: authHeader(apiKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let raw: unknown = text;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    // keep
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      raw,
      error: `FUB people PUT HTTP ${res.status}`,
    };
  }

  return { ok: true, status: res.status, personId, raw };
}
