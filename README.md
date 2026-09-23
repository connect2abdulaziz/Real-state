# Homeowner Valuation — Conversational Flow + AI Valuation

Implements **Section 2 (Homeowner Experience)** and **Section 3 (AI
Property Valuation)** of the SOW: a one-question-at-a-time conversational
flow that collects the property information listed in 2.2, with adaptive
follow-ups, persists everything to Supabase in structured form, then
automatically submits it to OpenAI using a structured valuation prompt and
stores the resulting preliminary estimate.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres) for storage
- OpenAI (structured outputs / `response_format: json_schema`, strict mode)
  for the valuation itself
- Zod for runtime validation of the model's output, as a second line of
  defense alongside the JSON Schema OpenAI enforces
- API routes (`app/api/**`) as the only thing that talks to Supabase or
  OpenAI, using server-only keys. The homeowner-facing page never touches
  either directly.

## Setup

1. **Create a Supabase project** (or use an existing one).
2. **Run the migrations**: open the SQL editor in your Supabase project and
   run, in order:
   - `supabase/migrations/0001_init.sql` — creates `homeowners`,
     `conversations`, and `properties`.
   - `supabase/migrations/0002_valuations.sql` — creates `valuations`.
3. **Copy env vars**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` from Supabase project settings → API, and
   `OPENAI_API_KEY` from your OpenAI account.
4. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
5. Visit `http://localhost:3000` → "Start your valuation".

## How data flows

1. Homeowner clicks **Start valuation** → `POST /api/conversations` creates
   a `conversations` row (`status = 'in_progress'`) and returns its id.
2. Each answer → `PATCH /api/conversations/[id]` appends to `transcript`
   (full back-and-forth, for audit and future prompt tuning) and merges
   into `answers` (the structured record).
3. On the last question → the same PATCH call is sent with `complete: true`,
   which:
   - upserts a `homeowners` row from the name/email/phone collected at the
     start of the conversation,
   - writes a normalized `properties` row (typed columns: bedrooms as int,
     bathrooms as numeric, etc.) — this is what Section 3's valuation step
     will read from,
   - marks the conversation `completed`.

## Section 3: how the valuation works

`lib/valuation/prompt.ts` holds the documented valuation instructions
(`VALUATION_SYSTEM_PROMPT`) and builds the user-turn content from a
property record (`buildValuationUserPrompt`). `PROMPT_VERSION` is bumped
whenever either changes, and stored on every valuation row, so past
valuations stay traceable to the instructions that produced them — this is
the "documented ... so the process can be reviewed and improved" deliverable
from SOW 3.

`lib/valuation/schema.ts` defines the output contract twice, deliberately:
- a JSON Schema passed to OpenAI's `strict: true` structured-output mode,
  which is what makes the model return controlled fields instead of a free
  response (SOW 4.2), and
- a Zod schema that re-validates the parsed result server-side (including
  a `low <= high` sanity check), as a second line of defense independent
  of OpenAI's own enforcement.

`lib/valuation/run-valuation.ts` (`runValuation`) is the orchestrator:
loads the property row, calls OpenAI, validates, and writes a `valuations`
row — `status: 'completed'` on success, `status: 'failed'` with
`error_message` set if anything throws, so a valuation failure is always
visible in the database rather than silently lost.

It's called two ways:
- **Automatically**, from `PATCH /api/conversations/[id]` the moment the
  property record is created — this is SOW 12 steps 4-7 end to end. A
  valuation failure doesn't fail that request; the homeowner's answers and
  property record are saved regardless, and `valuationError` is returned
  so the UI can say the estimate isn't ready yet.
- **On demand**, via `POST /api/valuations { propertyId }` — for re-runs,
  e.g. a future "regenerate estimate" action in the admin dashboard.
  `GET /api/valuations/[propertyId]` fetches the latest one.

Phase 1 has no MLS integration (SOW 13), so `marketContext` in
`buildValuationUserPrompt` is optional and normally omitted — the prompt
explicitly tells the model not to assume comparable-sales data exists, and
to widen the range and lower confidence accordingly. That's the seam for
supplying whatever "available property/location/market information" a
later phase adds (e.g. public tax records), without changing the contract.

The homeowner-facing UI (`ValuationPanel.tsx`) shows the range, confidence,
factors, explanation, and limitations as soon as they're ready — mainly to
make the round trip visible end to end; the polished version of this is
Section 5's PDF report, not this inline panel.

## What's deliberately out of scope here

This covers Sections 2 and 3 only. It does **not** include:

- **Section 4.1** — OpenAI is not used to generate the *conversation*
  questions dynamically. The question script in `lib/valuation/steps.ts`
  is a fixed decision tree.
- **Section 5** — PDF report generation (the valuation data it needs is
  now fully available in the `valuations` table).
- **Section 6** — consultation/appointment booking.
- **Section 7** — Follow Up Boss sync.
- **Section 9** — the admin dashboard (would read from these same tables,
  likely via Supabase Auth + RLS policies rather than the service-role
  route handlers used here).

## Adaptive follow-ups

`lib/valuation/steps.ts` defines each question with an optional `condition`
function. For example, `basementDetail` only appears if `hasBasement ===
"Yes"`, and `renovationDetail` only appears if `hasRenovations === "Yes"` —
this is how "ask relevant follow-up questions based on the homeowner's
previous answers" (SOW 2.1) is implemented without a model call for Phase 1.
