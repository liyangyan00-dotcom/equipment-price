

-- V3.2 AI enhanced tables

create table ai_tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text unique not null,
  task_type text not null,
  source_type text,
  source_id uuid,
  input_payload jsonb,
  output_payload jsonb,
  confidence numeric,
  risk_level text,
  missing_fields jsonb,
  suggested_actions jsonb,
  status text default 'created',
  assigned_reviewer text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table price_leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text unique not null,
  lead_type text,
  item_name text not null,
  specification text,
  price numeric,
  currency text,
  region text,
  source_name text,
  source_url text,
  source_type text,
  collected_by text,
  ai_match_score numeric,
  confidence_suggestion text,
  risk_notes jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);
