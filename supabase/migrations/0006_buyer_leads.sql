-- Buyer lead support (sell vs buy journeys).
-- Run in Supabase SQL editor after 0005_phase_b.sql.

alter table conversations
  add column if not exists lead_type text not null default 'seller'
    check (lead_type in ('seller', 'buyer'));

alter table conversations
  add column if not exists locale text not null default 'en'
    check (locale in ('en', 'fr'));

create index if not exists conversations_lead_type_idx
  on conversations (lead_type);

-- Allow buyer_completed as an integration trigger.
alter table integration_events drop constraint if exists integration_events_trigger_check;
alter table integration_events
  add constraint integration_events_trigger_check
  check (trigger in (
    'valuation_completed',
    'consultation_requested',
    'consultation_declined',
    'report_ready',
    'buyer_completed'
  ));
