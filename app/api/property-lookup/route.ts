import { NextResponse } from "next/server";
import { fetchPropertyFacts } from "@/lib/valuation/fetch-property-facts";

/**
 * POST /api/property-lookup
 * Body: { streetAddress, city?, postalCode?, locale? }
 * Soft-fails with facts: null when lookup is disabled or finds nothing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const streetAddress =
      typeof body.streetAddress === "string" ? body.streetAddress.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const postalCode =
      typeof body.postalCode === "string" ? body.postalCode.trim() : "";
    const locale = body.locale === "fr" ? "fr" : "en";

    if (!streetAddress || streetAddress.length < 3) {
      return NextResponse.json(
        { ok: false, error: "streetAddress required", facts: null },
        { status: 400 }
      );
    }

    const result = await fetchPropertyFacts({
      streetAddress,
      city: city || undefined,
      postalCode: postalCode || undefined,
      locale,
    });

    return NextResponse.json({
      ok: true,
      facts: result.facts,
      via: result.via,
      query: result.query,
      sources: result.sources || [],
    });
  } catch (err) {
    console.error("POST /api/property-lookup failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Lookup failed",
        facts: null,
        via: "failed",
      },
      { status: 500 }
    );
  }
}
