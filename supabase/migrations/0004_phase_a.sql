-- Phase A: PDF report tracking + consultation requests (SOW 5 & 6).
-- Run after 0003_estatevalora_fields.sql.

alter table valuations
  add column if not exists report_generated_at timestamptz;

create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  homeowner_id uuid references homeowners(id) on delete set null,
  valuation_id uuid references valuations(id) on delete set null,

  -- true = wants Ashkan's professional review; false = just exploring
  wants_review boolean not null,
  channel text check (channel is null or channel in ('phone', 'video')),
  preferred_time text,

  status text not null default 'requested'
    check (status in ('requested', 'declined', 'scheduled', 'completed')),

  created_at timestamptz not null default now()
);

create index if not exists consultations_conversation_id_idx
  on consultations (conversation_id);
create index if not exists consultations_valuation_id_idx
  on consultations (valuation_id);

alter table consultations enable row level security;
