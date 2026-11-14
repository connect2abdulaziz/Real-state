/**
 * Smoke-test RAG chat API (requires migration + ingest + OpenAI credits).
 * Usage: npm run smoke:chat
 */
const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function ask(message: string, locale: "en" | "fr", sessionId?: string) {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, locale, sessionId }),
  });
  const data = await res.json();
  console.log("\n===", locale.toUpperCase(), message);
  console.log("HTTP", res.status);
  if (!res.ok) {
    console.log(data);
    return null;
  }
  console.log("session", data.sessionId);
  console.log("sources", (data.sources || []).map((s: { title: string }) => s.title));
  console.log((data.reply || "").slice(0, 500));
  return data.sessionId as string;
}

async function main() {
  let session = await ask(
    "What condo sold prices look like in Montreal from your comps?",
    "en"
  );
  if (!session) process.exit(1);
  session = await ask(
    "And single-family houses on the market in Laval?",
    "en",
    session
  );
  await ask(
    "Quels exemples de maisons vendues dans les Laurentides avez-vous?",
    "fr"
  );
  console.log("\nSmoke chat done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
