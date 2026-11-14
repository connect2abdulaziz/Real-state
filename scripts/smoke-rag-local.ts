/**
 * Offline smoke tests for RAG helpers (no OpenAI / Supabase required).
 */
import {
  chunkText,
  inferMetaFromPath,
  inferQueryFilters,
} from "../lib/rag/meta";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const condoSold = inferMetaFromPath(
  "Condo/CONDO SOLD (MONTREAL).pdf"
);
assert(condoSold.property_type === "condo", "condo type");
assert(condoSold.status === "sold", "condo sold");
assert(condoSold.region === "Montreal", "condo region");

const houseListing = inferMetaFromPath(
  "Single Family House/Single family house ON THE MARKET LAVAL.pdf"
);
assert(houseListing.property_type === "single_family", "house type");
assert(houseListing.status === "listing", "house listing");
assert(houseListing.region === "Laval", "house region");

const filters = inferQueryFilters(
  "What condo sold prices look like in Montreal?"
);
assert(filters.property_type === "condo", "filter type");
assert(filters.status === "sold", "filter status");
assert(filters.region === "Montreal", "filter region");

const fr = inferQueryFilters(
  "Quels exemples de maisons vendues dans les Laurentides avez-vous?"
);
assert(fr.property_type === "single_family", "fr house");
assert(fr.status === "sold", "fr sold");
assert(fr.region === "Laurentides", "fr region");

const chunks = chunkText("alpha ".repeat(2000), {
  maxChars: 500,
  overlap: 50,
});
assert(chunks.length > 3, "chunking splits long text");
assert(chunks.every((c) => c.length > 0), "non-empty chunks");

console.log("smoke-rag-local: OK");
console.log({
  condoSold,
  houseListing,
  filters,
  fr,
  chunkCount: chunks.length,
});
