-- Phase B: Follow Up Boss sync tracking + notification audit log (SOW 7 & 8).

alter table homeowners
  add column if not exists fub_person_id text;

alter table homeowners
  add column if not exists fub_synced_at timestamptz;

create table if not exists integration_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('fub_sync', 'email', 'sms')),
  trigger text not null
    check (trigger in (
      'valuation_completed',
      'consultation_requested',
      'consultation_declined',
      'report_ready'
    )),
  conversation_id uuid references conversations(id) on delete set null,
  homeowner_id uuid references homeowners(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  valuation_id uuid references valuations(id) on delete set null,
  consultation_id uuid references consultations(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'skipped')),
  provider text,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists integration_events_conversation_id_idx
  on integration_events (conversation_id);
create index if not exists integration_events_kind_idx
  on integration_events (kind);

alter table integration_events enable row level security;
