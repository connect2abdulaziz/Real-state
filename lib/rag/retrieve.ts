import { createOpenAIClient } from "@/lib/openai/client";
import { resolveChatModelFromEnv } from "@/lib/openai/defaults";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inferQueryFilters,
  type CompPropertyType,
  type CompStatus,
} from "@/lib/rag/meta";

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

export const CHAT_MODEL = resolveChatModelFromEnv();

export type RetrievedChunk = {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  source_file: string;
  title: string | null;
  property_type: string | null;
  status: string | null;
  region: string | null;
  similarity: number;
};

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = createOpenAIClient();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

export async function retrieveChunks(
  query: string,
  opts?: {
    matchCount?: number;
    property_type?: CompPropertyType;
    status?: CompStatus;
    region?: string;
    /**
     * When false, do not drop property_type/status filters on empty results
     * (valuation Fix 5 — avoid mixing condo with single-family).
     * Chat keeps the default true for broader answers.
     */
    allowUnfilteredFallback?: boolean;
  }
): Promise<RetrievedChunk[]> {
  const allowUnfiltered = opts?.allowUnfilteredFallback !== false;
  const filters = {
    ...inferQueryFilters(query),
    ...opts,
  };

  const [embedding] = await embedTexts([query]);
  const supabase = createAdminClient();

  const vectorLiteral = `[${embedding.join(",")}]`;
  const matchCount = opts?.matchCount ?? 8;

  const run = async (args: {
    property_type: string | null;
    status: string | null;
    region: string | null;
  }) => {
    const { data, error } = await supabase.rpc("match_kb_chunks", {
      query_embedding: vectorLiteral,
      match_count: matchCount,
      filter_property_type: args.property_type,
      filter_status: args.status,
      filter_region: args.region,
    });
    if (error) {
      console.error("match_kb_chunks failed:", error);
      return [] as RetrievedChunk[];
    }
    return (data || []) as RetrievedChunk[];
  };

  // 1) Full soft filters
  let rows = await run({
    property_type: filters.property_type ?? null,
    status: filters.status ?? null,
    region: filters.region ?? null,
  });
  if (rows.length > 0) return rows;

  // 2) Drop region only (keep type + status)
  if (filters.region) {
    rows = await run({
      property_type: filters.property_type ?? null,
      status: filters.status ?? null,
      region: null,
    });
    if (rows.length > 0) return rows;
  }

  // 3) Optional: drop all filters (chat). Valuation sets allowUnfilteredFallback=false.
  if (!allowUnfiltered) return [];

  rows = await run({
    property_type: null,
    status: null,
    region: null,
  });
  return rows;
}

export function buildChatSystemPrompt(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).

Réponds comme ChatGPT: **gras** pour les chiffres, séparateurs ---, court et propre.
JAMAIS d'URLs, domaines (ex. quelquechose-remax.ca), noms de sites, "selon…", ni liste Sources.
Jamais PDF / knowledge base. N'invente pas de prix.
Réponds en français (Québec).`;
  }

  return `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).

Answer like ChatGPT: **bold** key numbers, --- dividers, clean and short.
NEVER include URLs, domains (e.g. something-remax.ca), website names, "according to…", or a Sources list.
Never PDF / knowledge base. Do not invent prices.
Reply in English.`;
}

export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(No matching comps were retrieved from the knowledge base.)";
  }
  return chunks
    .map((c, i) => {
      const label = [
        c.title || c.source_file,
        c.property_type,
        c.status,
        c.region,
      ]
        .filter(Boolean)
        .join(" · ");
      return `[${i + 1}] ${label}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

export function uniqueSources(chunks: RetrievedChunk[]): Array<{
  title: string;
  region: string | null;
  status: string | null;
  property_type: string | null;
  source_file: string;
}> {
  const seen = new Set<string>();
  const out: Array<{
    title: string;
    region: string | null;
    status: string | null;
    property_type: string | null;
    source_file: string;
  }> = [];
  for (const c of chunks) {
    const key = c.source_file || c.title || c.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: c.title || c.source_file,
      region: c.region,
      status: c.status,
      property_type: c.property_type,
      source_file: c.source_file,
    });
  }
  return out.slice(0, 6);
}
