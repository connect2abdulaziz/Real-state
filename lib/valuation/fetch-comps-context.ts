import type { PropertyRecord } from "@/lib/types";
import {
  formatRetrievedContext,
  retrieveChunks,
  uniqueSources,
  type RetrievedChunk,
} from "@/lib/rag/retrieve";
import { inferQueryFilters } from "@/lib/rag/meta";
import { subjectCompTypeFilter } from "@/lib/valuation/data-quality";

export type CompsContextResult = {
  text: string;
  query: string;
  via: "rag" | "skipped" | "failed" | "empty";
  chunkCount: number;
  sources: ReturnType<typeof uniqueSources>;
  /** True when chunks match the subject's property-type filter. */
  typeMatched: boolean;
};

export function isValuationRagCompsEnabled(): boolean {
  if (process.env.VALUATION_RAG_COMPS === "false") return false;
  if (process.env.VALUATION_RAG_COMPS === "true") return true;
  return true;
}

/**
 * Builds an embedding query aimed at sold comps near the subject property.
 */
export function buildCompRetrievalQuery(property: PropertyRecord): string {
  const details = (property.details || {}) as Record<string, unknown>;
  const city =
    (typeof details.city === "string" && details.city.trim()) || "";
  const type = property.property_type || "residential";
  const beds = property.bedrooms != null ? `${property.bedrooms} bedrooms` : "";
  const area =
    property.living_area_sqft != null
      ? `${property.living_area_sqft} sqft`
      : "";
  const year =
    property.year_built != null ? `built ${property.year_built}` : "";

  return [
    "Sold comparable properties",
    type,
    property.address || "",
    city,
    "Quebec Canada",
    beds,
    area,
    year,
    "sale price CAD",
  ]
    .filter(Boolean)
    .join(" ");
}

function filterChunksByType(
  chunks: RetrievedChunk[],
  expected: string | undefined
): RetrievedChunk[] {
  if (!expected) return chunks;
  return chunks.filter((c) => {
    if (!c.property_type) return true; // unknown — keep but soft
    return c.property_type === expected;
  });
}

/**
 * Retrieve sold comps from the Estate Valora knowledge base for valuation.
 * Keeps property-type filter (no condo↔house mix). Empty > wrong type.
 */
export async function fetchCompsContext(
  property: PropertyRecord
): Promise<CompsContextResult> {
  const query = buildCompRetrievalQuery(property);
  if (!isValuationRagCompsEnabled()) {
    return {
      text: "",
      query,
      via: "skipped",
      chunkCount: 0,
      sources: [],
      typeMatched: false,
    };
  }

  try {
    const inferred = inferQueryFilters(
      [property.address, property.property_type, query]
        .filter(Boolean)
        .join(" ")
    );
    const property_type =
      subjectCompTypeFilter(property) || inferred.property_type;

    const chunks: RetrievedChunk[] = await retrieveChunks(query, {
      matchCount: 6,
      property_type,
      status: "sold",
      region: inferred.region,
      allowUnfilteredFallback: false,
    });

    const typed = filterChunksByType(chunks, property_type);
    const use = typed.length > 0 ? typed : chunks;
    const typeMatched =
      Boolean(property_type) &&
      use.length > 0 &&
      use.every(
        (c) => !c.property_type || c.property_type === property_type
      );

    if (use.length === 0) {
      return {
        text: "",
        query,
        via: "empty",
        chunkCount: 0,
        sources: [],
        typeMatched: false,
      };
    }

    const header = typeMatched
      ? ""
      : "(Note: some comps lack a clear property-type tag — treat cautiously; do not mix condo with single-family.)\n\n";

    return {
      text: header + formatRetrievedContext(use),
      query,
      via: "rag",
      chunkCount: use.length,
      sources: uniqueSources(use),
      typeMatched,
    };
  } catch (err) {
    console.error("fetchCompsContext failed:", err);
    return {
      text: "",
      query,
      via: "failed",
      chunkCount: 0,
      sources: [],
      typeMatched: false,
    };
  }
}
