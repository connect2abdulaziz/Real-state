/**
 * Smoke-test Option 2 market web lookup (no DB write).
 * Usage: npx tsx scripts/test-market-context.ts
 */
import { fetchMarketContext } from "../lib/valuation/fetch-market-context";
import type { PropertyRecord } from "../lib/types";

async function main() {
  const property = {
    id: "test",
    homeowner_id: null,
    conversation_id: "test",
    address: "28 rue de Josselin, Blainville, J7B 1X9",
    property_type: "Single-family home",
    bedrooms: 3,
    bathrooms: 2,
    living_area_sqft: 2000,
    lot_size: null,
    year_built: 2005,
    basement_info: null,
    parking_info: null,
    condition: null,
    renovations: null,
    notable_features: null,
    additional_notes: null,
    ownership: null,
    details: { city: "Blainville", postalCode: "J7B 1X9" },
    created_at: new Date().toISOString(),
  } as PropertyRecord;

  console.log("Fetching market context…");
  const result = await fetchMarketContext(property);
  console.log(JSON.stringify({ via: result.via, query: result.query, sources: result.sources }, null, 2));
  console.log("\n--- market brief ---\n");
  console.log(result.text || "(empty)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
