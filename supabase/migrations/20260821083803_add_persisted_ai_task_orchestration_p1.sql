create table public.wpi_ai_execution_tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique default (
    'AIT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  workflow_key text not null check (
    workflow_key in (
      'equipment_price_pre_review',
      'quote_recognition',
      'price_collection',
      'comparison_analysis',
      'boq_parsing',
      'inquiry_letter',
      'report_generation'
    )
  ),
  title text not null check (length(btrim(title)) between 1 and 160),
  source_label text not null default '' check (length(source_label) <= 300),
  business_object_type text not null default '' check (length(business_object_type) <= 80),
  business_object_id text,
  business_href text check (business_href is null or length(business_href) <= 500),
  status text not null default 'queued' check (
    status in ('queued', 'running', 'needs_review', 'completed', 'failed', 'cancelled')
  ),
  stage text not null default 'accepted' check (
    stage in (
      'accepted', 'loading_config', 'calling_provider', 'validating_output',
      'persisting_result', 'awaiting_review', 'completed', 'failed', 'cancelled'
    )
  ),
  progress smallint not null default 0 check (progress between 0 and 100),
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level,
  requires_human_review boolean not null default true,
  review_decision text check (
    review_decision is null or review_decision in ('approved', 'request_changes', 'rejected')
  ),
  review_note text check (review_note is null or length(review_note) <= 4000),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 20),
  max_attempts smallint not null default 3 check (max_attempts between 1 and 10),
  error_code text,
  error_message text check (error_message is null or length(error_message) <= 4000),
  idempotency_key text,
  requested_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_ai_execution_tasks_input_object check (jsonb_typeof(input_payload) = 'object'),
  constraint wpi_ai_execution_tasks_output_object check (
    output_payload is null or jsonb_typeof(output_payload) = 'object'
  ),
  constraint wpi_ai_execution_tasks_review_consistency check (
    (review_decision is null and reviewed_by is null and reviewed_at is null)
    or (review_decision is not null and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index wpi_ai_execution_tasks_idempotency_idx
  on public.wpi_ai_execution_tasks(organization_id, idempotency_key)
  where idempotency_key is not null;
create index wpi_ai_execution_tasks_org_created_idx
  on public.wpi_ai_execution_tasks(organization_id, created_at desc);
create index wpi_ai_execution_tasks_org_status_idx
  on public.wpi_ai_execution_tasks(organization_id, status, created_at desc);
create index wpi_ai_execution_tasks_requested_by_idx
  on public.wpi_ai_execution_tasks(requested_by, created_at desc);
create index wpi_ai_execution_tasks_reviewer_idx
  on public.wpi_ai_execution_tasks(reviewed_by, reviewed_at desc)
  where reviewed_by is not null;
create index wpi_ai_execution_tasks_business_object_idx
  on public.wpi_ai_execution_tasks(organization_id, business_object_type, business_object_id)
  where business_object_id is not null;

create table public.wpi_ai_execution_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_id uuid not null references public.wpi_ai_execution_tasks(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created', 'started', 'progress', 'provider_completed', 'output_validated',
      'needs_review', 'reviewed', 'retry_queued', 'failed', 'cancelled'
    )
  ),
  status text not null check (
    status in ('queued', 'running', 'needs_review', 'completed', 'failed', 'cancelled')
  ),
  stage text not null,
  progress smallint not null check (progress between 0 and 100),
  message text not null check (length(btrim(message)) between 1 and 1000),
  payload jsonb not null default '{}'::jsonb,
  actor_type text not null default 'system' check (actor_type in ('user', 'gateway', 'system')),
  actor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint wpi_ai_execution_events_payload_object check (jsonb_typeof(payload) = 'object')
);

create index wpi_ai_execution_events_task_created_idx
  on public.wpi_ai_execution_events(task_id, created_at asc);
create index wpi_ai_execution_events_org_created_idx
  on public.wpi_ai_execution_events(organization_id, created_at desc);
create index wpi_ai_execution_events_actor_idx
  on public.wpi_ai_execution_events(actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.wpi_ai_gateway_runs
  add column execution_task_id uuid references public.wpi_ai_execution_tasks(id) on delete set null;

create index wpi_ai_gateway_runs_execution_task_idx
  on public.wpi_ai_gateway_runs(execution_task_id, created_at desc)
  where execution_task_id is not null;

create trigger wpi_ai_execution_tasks_updated_at
before update on public.wpi_ai_execution_tasks
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_ai_execution_tasks enable row level security;
alter table public.wpi_ai_execution_events enable row level security;

create policy wpi_ai_execution_tasks_read
on public.wpi_ai_execution_tasks
for select to authenticated
using (private.wpi_is_org_member(organization_id));

create policy wpi_ai_execution_events_read
on public.wpi_ai_execution_events
for select to authenticated
using (private.wpi_is_org_member(organization_id));

revoke all on public.wpi_ai_execution_tasks, public.wpi_ai_execution_events
  from public, anon, authenticated;
grant select on public.wpi_ai_execution_tasks, public.wpi_ai_execution_events
  to authenticated;
grant select, insert, update, delete on public.wpi_ai_execution_tasks, public.wpi_ai_execution_events
  to service_role;

comment on table public.wpi_ai_execution_tasks is
  'Organization-scoped durable AI task ledger. All AI outputs require explicit human review before business adoption.';
comment on table public.wpi_ai_execution_events is
  'Append-only progress, failure, retry and human-review timeline for durable AI execution tasks.';

;
