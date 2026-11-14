/**
 * Smoke-test Option 2 market web lookup (no DB write).
 * Usage: node --env-file=.env.local scripts/test-market-context.mjs
 */
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const query = [
  "Current average selling price and recent market data for Single-family home properties in Blainville, postal J7B 1X9, Quebec, Canada.",
  "Prefer recent Canadian / Quebec sources (HonestDoor, Centris summaries, realtor.ca, local market reports).",
  "Include neighbourhood average if available, and note the date of the figures.",
  "Reply with a short factual market brief (numbers in CAD) and cite source names/URLs.",
].join(" ");

const model = process.env.OPENAI_MARKET_MODEL || process.env.OPENAI_VALUATION_MODEL || "gpt-4o";

console.log("Fetching market context via Responses + web_search…");
const started = Date.now();

const res = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    input: `You are a Canadian residential market researcher for Estate Valora (Quebec focus).
Use web search to find recent average sale prices / market reports for the requested area.
Return a concise market brief in English with CAD figures, period, and sources.

Research request:
${query}`,
  }),
});

const payload = await res.json();
const ms = Date.now() - started;
console.log(`HTTP ${res.status} in ${ms}ms`);

if (!res.ok) {
  console.error(JSON.stringify(payload, null, 2).slice(0, 2000));
  process.exit(1);
}

const text =
  payload.output_text ||
  (Array.isArray(payload.output)
    ? payload.output
        .filter((o) => o.type === "message")
        .flatMap((o) => o.content || [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text)
        .join("\n")
    : "");

console.log("\n--- market brief ---\n");
console.log(text || "(empty)");
console.log("\n--- meta ---");
console.log({ model, id: payload.id, status: payload.status });
