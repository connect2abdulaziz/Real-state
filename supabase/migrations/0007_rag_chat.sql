-- RAG knowledge base + freeform chat sessions (Estate Valora chatbot).
-- Requires pgvector. Run this file in the Supabase SQL editor (Dashboard → SQL),
-- then: npm run extract:comps && npm run ingest:comps
-- Chat UI: /chat

create extension if not exists vector;

-- Allow freeform chat sessions on conversations
alter table conversations
  drop constraint if exists conversations_lead_type_check;

alter table conversations
  add constraint conversations_lead_type_check
  check (lead_type in ('seller', 'buyer', 'chat'));

-- Source documents (comps PDFs, brand docs, etc.)
create table if not exists kb_documents (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  title text,
  property_type text,
  status text,
  region text,
  checksum text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_file)
);

create index if not exists kb_documents_region_idx on kb_documents (region);
create index if not exists kb_documents_status_idx on kb_documents (status);
create index if not exists kb_documents_property_type_idx on kb_documents (property_type);

-- Embedded chunks for similarity search (text-embedding-3-small = 1536 dims)
create table if not exists kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references kb_documents(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kb_chunks_document_id_idx on kb_chunks (document_id);

-- HNSW index for cosine similarity (works before/after bulk ingest)
create index if not exists kb_chunks_embedding_idx
  on kb_chunks
  using hnsw (embedding vector_cosine_ops);

drop trigger if exists kb_documents_set_updated_at on kb_documents;
create trigger kb_documents_set_updated_at
  before update on kb_documents
  for each row execute function set_updated_at();

alter table kb_documents enable row level security;
alter table kb_chunks enable row level security;

-- Similarity search RPC used by /api/chat
create or replace function match_kb_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  filter_property_type text default null,
  filter_status text default null,
  filter_region text default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  source_file text,
  title text,
  property_type text,
  status text,
  region text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    d.source_file,
    d.title,
    d.property_type,
    d.status,
    d.region,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from kb_chunks c
  join kb_documents d on d.id = c.document_id
  where c.embedding is not null
    and (filter_property_type is null or d.property_type = filter_property_type)
    and (filter_status is null or d.status = filter_status)
    and (filter_region is null or d.region ilike filter_region)
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
