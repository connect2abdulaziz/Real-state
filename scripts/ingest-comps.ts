/**
 * Ingest Estate Valora comps PDFs into Supabase kb_documents / kb_chunks.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest-comps.ts
 *
 * Expects PDFs under data/estate-valora-comps/ (unzip Estate Valora .zip there first).
 */
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { createAdminClient } from "../lib/supabase/admin";
import { chunkText, inferMetaFromPath } from "../lib/rag/meta";
import { embedTexts } from "../lib/rag/retrieve";

const ROOT = path.join(process.cwd(), "data", "estate-valora-comps");

async function listPdfs(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.name.startsWith(".") || entry.name === "__MACOSX") continue;
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && /\.pdf$/i.test(entry.name)) out.push(full);
    }
  }
  await walk(dir);
  return out.sort();
}

async function main() {
  const pdfs = await listPdfs(ROOT);
  if (pdfs.length === 0) {
    console.error(
      `No PDFs found in ${ROOT}\nUnzip "Estate Valora .zip" into data/estate-valora-comps/ first.`
    );
    process.exit(1);
  }

  console.log(`Found ${pdfs.length} PDFs`);
  const supabase = createAdminClient();

  const probe = await supabase.from("kb_documents").select("id").limit(1);
  if (probe.error) {
    console.error(
      "kb_documents missing or unreachable:",
      probe.error.message
    );
    console.error(
      "Apply supabase/migrations/0007_rag_chat.sql in the Supabase SQL editor, then retry."
    );
    process.exit(1);
  }

  for (const file of pdfs) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const buf = await fs.readFile(file);
    const checksum = createHash("sha256").update(buf).digest("hex");
    const meta = inferMetaFromPath(rel);

    const { data: existing } = await supabase
      .from("kb_documents")
      .select("id, checksum")
      .eq("source_file", meta.source_file)
      .maybeSingle();

    if (existing?.checksum === checksum) {
      console.log(`skip (unchanged): ${rel}`);
      continue;
    }

    let text = "";
    try {
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      text = (parsed.text || "").trim();
      await parser.destroy().catch(() => undefined);
    } catch (err) {
      console.error(`PDF parse failed: ${rel}`, err);
      continue;
    }

    if (!text || text.length < 40) {
      console.warn(`thin text, skipping: ${rel} (${text.length} chars)`);
      continue;
    }

    const header = [
      `Source: ${meta.title}`,
      meta.property_type ? `Type: ${meta.property_type}` : null,
      meta.status ? `Status: ${meta.status}` : null,
      meta.region ? `Region: ${meta.region}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const chunks = chunkText(`${header}\n\n${text}`);
    console.log(`ingest: ${rel} → ${chunks.length} chunks`);

    const embeddings = await embedTexts(chunks);

    let documentId = existing?.id as string | undefined;
    if (documentId) {
      await supabase.from("kb_chunks").delete().eq("document_id", documentId);
      await supabase
        .from("kb_documents")
        .update({
          title: meta.title,
          property_type: meta.property_type,
          status: meta.status,
          region: meta.region,
          checksum,
          chunk_count: chunks.length,
        })
        .eq("id", documentId);
    } else {
      const { data: doc, error: docErr } = await supabase
        .from("kb_documents")
        .insert({
          source_file: meta.source_file,
          title: meta.title,
          property_type: meta.property_type,
          status: meta.status,
          region: meta.region,
          checksum,
          chunk_count: chunks.length,
        })
        .select("id")
        .single();
      if (docErr || !doc) {
        console.error(`document insert failed: ${rel}`, docErr);
        continue;
      }
      documentId = doc.id;
    }

    const rows = chunks.map((content, i) => ({
      document_id: documentId,
      chunk_index: i,
      content,
      // pgvector via PostgREST accepts vector as a string literal
      embedding: `[${embeddings[i].join(",")}]`,
      metadata: {
        property_type: meta.property_type,
        status: meta.status,
        region: meta.region,
        source_file: meta.source_file,
        title: meta.title,
      },
    }));

    // Insert in batches
    const batchSize = 20;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("kb_chunks").insert(batch);
      if (error) {
        console.error(`chunk insert failed ${rel} @${i}:`, error);
      }
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
