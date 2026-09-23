-- Phase 1 schema addition for Section 3 (AI Property Valuation).
-- Run after 0001_init.sql.

create table if not exists valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  homeowner_id uuid references homeowners(id) on delete set null,

  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),

  -- Structured valuation output (SOW 3: "Return the valuation in a
  -- structured format that can be stored and used to generate the
  -- homeowner report").
  estimated_value_low numeric,
  estimated_value_high numeric,
  confidence text check (confidence in ('low', 'medium', 'high')),
  factors_increasing_value jsonb not null default '[]'::jsonb,
  factors_decreasing_value jsonb not null default '[]'::jsonb,
  property_strengths jsonb not null default '[]'::jsonb,
  potential_considerations jsonb not null default '[]'::jsonb,
  market_observations jsonb not null default '[]'::jsonb,
  explanation text,
  limitations text,

  -- Full raw model response, kept for audit / prompt-tuning as called for
  -- in SOW 3 ("valuation prompt, required inputs, output structure...
  -- documented... so the valuation process can be reviewed and improved").
  model text,
  prompt_version text,
  raw_model_output jsonb,
  error_message text,

  created_at timestamptz not null default now()
);

create index if not exists valuations_property_id_idx
  on valuations (property_id);
create index if not exists valuations_conversation_id_idx
  on valuations (conversation_id);

alter table valuations enable row level security;
-- Same posture as the rest of Phase 1: no public policies. Writes and
-- reads for this flow go through the Next.js API routes using the
-- service-role key.
