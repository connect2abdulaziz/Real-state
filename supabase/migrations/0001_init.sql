-- Phase 1 schema for the Homeowner Experience (SOW section 2).
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- One row per homeowner who starts a conversation.
create table if not exists homeowners (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- One row per conversation session. `answers` is the structured record
-- (SOW 2.1: "collected information will be stored in structured form and
-- passed to the valuation process"); `transcript` is the full back-and-forth
-- for audit / debugging / future prompt tuning.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid references homeowners(id) on delete set null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  transcript jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_homeowner_id_idx
  on conversations (homeowner_id);

-- Normalized property record written once a conversation completes.
-- This is what section 3 (AI Property Valuation) will read from.
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid references homeowners(id) on delete set null,
  conversation_id uuid not null references conversations(id) on delete cascade,
  address text,
  property_type text,
  bedrooms integer,
  bathrooms numeric,
  living_area_sqft integer,
  lot_size text,
  year_built integer,
  basement_info text,
  parking_info text,
  condition text,
  renovations text,
  notable_features text,
  additional_notes text,
  created_at timestamptz not null default now()
);

create index if not exists properties_conversation_id_idx
  on properties (conversation_id);

-- Keep updated_at current on conversations.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists conversations_set_updated_at on conversations;
create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function set_updated_at();

-- Row Level Security: enabled with no public policies. The homeowner
-- conversation has no Supabase auth session, so all reads/writes for this
-- flow go through the Next.js API routes using the service-role key,
-- which bypasses RLS by design. Add policies here later if/when the
-- admin dashboard (SOW section 9) needs authenticated Supabase-session
-- access instead of going through API routes.
alter table homeowners enable row level security;
alter table conversations enable row level security;
alter table properties enable row level security;
