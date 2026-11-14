import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const s = createAdminClient();
  const tables = [
    "homeowners",
    "conversations",
    "kb_documents",
    "kb_chunks",
  ];
  for (const t of tables) {
    const { error, count } = await s
      .from(t)
      .select("*", { count: "exact", head: true });
    console.log(t, error ? `ERROR: ${error.message}` : `ok count=${count}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
