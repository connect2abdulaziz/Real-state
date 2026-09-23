-- EstateValora conversation fields (SOW section 2 expansion).
-- Run after 0001_init.sql / 0002_valuations.sql.

alter table properties
  add column if not exists ownership text;

alter table properties
  add column if not exists details jsonb not null default '{}'::jsonb;
