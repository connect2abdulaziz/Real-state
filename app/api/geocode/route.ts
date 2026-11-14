import { NextRequest, NextResponse } from "next/server";
import type { AddressSuggestion } from "@/lib/valuation/parse-address";

/**
 * Lightweight Canada geocode via OpenStreetMap Nominatim.
 * Used when the user only enters a street and we need a likely city / postal.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 200) {
    return NextResponse.json(
      { ok: false, error: "Query too short or too long" },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("countrycodes", "ca");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "EstateValora/1.0 (https://estatevalora.com; valuation assistant)",
        Accept: "application/json",
        "Accept-Language": "fr,en",
      },
      // Cache similar street lookups for a day
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "Geocode upstream failed" },
        { status: 502 }
      );
    }

    const rows = (await res.json()) as Array<{
      display_name?: string;
      address?: Record<string, string>;
    }>;

    const suggestion = pickSuggestion(rows);
    if (!suggestion) {
      return NextResponse.json({ ok: true, suggestion: null });
    }

    return NextResponse.json({ ok: true, suggestion });
  } catch (err) {
    console.error("Geocode failed:", err);
    return NextResponse.json(
      { ok: false, error: "Geocode failed" },
      { status: 500 }
    );
  }
}

function pickSuggestion(
  rows: Array<{ display_name?: string; address?: Record<string, string> }>
): AddressSuggestion | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const scored = rows
    .map((row) => {
      const a = row.address || {};
      const city =
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.city_district ||
        a.suburb ||
        "";
      const postalCode = a.postcode
        ? a.postcode.replace(/\s+/g, " ").toUpperCase()
        : undefined;
      const state = (a.state || a.province || "").toLowerCase();
      const isQc =
        state.includes("quebec") ||
        state.includes("québec") ||
        state === "qc";
      return {
        city: city.trim(),
        postalCode,
        displayName: row.display_name || "",
        isQc,
      };
    })
    .filter((s) => s.city.length > 0);

  if (scored.length === 0) return null;

  scored.sort((a, b) => Number(b.isQc) - Number(a.isQc));
  const best = scored[0];
  return {
    city: best.city,
    postalCode: best.postalCode,
    displayName: best.displayName,
  };
}
