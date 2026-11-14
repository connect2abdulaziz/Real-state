import { createOpenAIClient } from "@/lib/openai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inferQueryFilters,
  type CompPropertyType,
  type CompStatus,
} from "@/lib/rag/meta";

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

export const CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL ||
  process.env.OPENAI_MARKET_MODEL ||
  process.env.OPENAI_VALUATION_MODEL ||
  "gpt-4.1";

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
  }
): Promise<RetrievedChunk[]> {
  const filters = {
    ...inferQueryFilters(query),
    ...opts,
  };

  const [embedding] = await embedTexts([query]);
  const supabase = createAdminClient();

  const vectorLiteral = `[${embedding.join(",")}]`;

  const { data, error } = await supabase.rpc("match_kb_chunks", {
    query_embedding: vectorLiteral,
    match_count: opts?.matchCount ?? 8,
    filter_property_type: filters.property_type ?? null,
    filter_status: filters.status ?? null,
    filter_region: filters.region ?? null,
  });

  if (error) {
    console.error("match_kb_chunks failed:", error);
    // Retry without filters if filtered search fails or returns nothing useful
    const retry = await supabase.rpc("match_kb_chunks", {
      query_embedding: vectorLiteral,
      match_count: opts?.matchCount ?? 8,
      filter_property_type: null,
      filter_status: null,
      filter_region: null,
    });
    if (retry.error) {
      console.error("match_kb_chunks unfiltered failed:", retry.error);
      return [];
    }
    return (retry.data || []) as RetrievedChunk[];
  }

  const rows = (data || []) as RetrievedChunk[];
  if (rows.length > 0) return rows;

  // Soft filters may be too strict — fall back unfiltered
  const retry = await supabase.rpc("match_kb_chunks", {
    query_embedding: vectorLiteral,
    match_count: opts?.matchCount ?? 8,
    filter_property_type: null,
    filter_status: null,
    filter_region: null,
  });
  if (retry.error) return [];
  return (retry.data || []) as RetrievedChunk[];
}

export function buildChatSystemPrompt(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return `Tu es l'assistant Estate Valora pour Ashkan Shamloo (courtier immobilier agréé, Montréal / Québec).

Format: texte simple seulement — pas de Markdown (#, **, tableaux).
Réponse directe, claire, amicale. Ne mentionne jamais des PDF / extraits manquants.
N'invente pas de prix. Aperçu préliminaire, sous réserve de révision par Ashkan Shamloo.
Réponds en français (Québec).`;
  }

  return `You are the Estate Valora assistant for Ashkan Shamloo (Licensed Real Estate Broker, Montreal / Quebec).

Format: plain text only — no Markdown (#, **, tables).
Direct, clear, friendly answer. Never mention missing PDFs / excerpts.
Do not invent prices. Preliminary insight, subject to review by Ashkan Shamloo.
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
