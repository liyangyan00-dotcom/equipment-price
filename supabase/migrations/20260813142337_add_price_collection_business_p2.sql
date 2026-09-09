create table public.wpi_price_collection_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_code text not null,
  target_type text not null check (target_type in ('equipment', 'material')),
  keyword text not null,
  specification text,
  region text,
  currency text not null default 'CNY',
  source_type text not null default 'all',
  frequency text not null default 'manual',
  provider text not null default 'queue_only',
  status text not null default 'queued' check (
    status in ('queued', 'running', 'paused', 'completed', 'stopped', 'failed')
  ),
  progress smallint not null default 0 check (progress between 0 and 100),
  current_source text,
  success_count integer not null default 0 check (success_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  config jsonb not null default '{}'::jsonb,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, task_code)
);

create table public.wpi_price_collection_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_id uuid references public.wpi_price_collection_tasks(id) on delete set null,
  lead_code text not null,
  target_type text not null check (target_type in ('equipment', 'material')),
  name text not null,
  specification text,
  source_type text not null,
  source_url text,
  source_checked_at timestamptz,
  evidence_code text,
  region text,
  price numeric(18, 2) not null check (price >= 0),
  currency text not null default 'CNY',
  normalized_price numeric(18, 2) check (normalized_price >= 0),
  original_unit text,
  supplier_name text,
  match_target text,
  ai_match_score numeric(5, 2) check (ai_match_score between 0 and 100),
  confidence numeric(5, 2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'medium',
  duplicate_status text not null default 'unique' check (
    duplicate_status in ('unique', 'suspected_duplicate')
  ),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'ready', 'transferred', 'rejected')
  ),
  review_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  transferred_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, lead_code)
);

create index wpi_collection_tasks_org_status_idx
  on public.wpi_price_collection_tasks(organization_id, status, created_at desc);
create index wpi_collection_leads_org_status_idx
  on public.wpi_price_collection_leads(organization_id, status, created_at desc);
create index wpi_collection_leads_task_idx
  on public.wpi_price_collection_leads(task_id);
create index wpi_collection_leads_source_idx
  on public.wpi_price_collection_leads(organization_id, source_type, source_checked_at desc);

create or replace function private.wpi_guard_collection_task_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status and not (
    (old.status in ('queued', 'failed', 'stopped') and new.status = 'running') or
    (old.status = 'running' and new.status in ('paused', 'completed', 'stopped', 'failed')) or
    (old.status = 'paused' and new.status in ('running', 'stopped'))
  ) then
    raise exception 'Invalid collection task transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create or replace function private.wpi_guard_collection_lead_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status then
    if not private.wpi_has_permission(old.organization_id, 'price.review') then
      raise exception 'Price review permission is required for lead decisions';
    end if;
    if not (
      (old.status = 'pending_review' and new.status in ('ready', 'rejected')) or
      (old.status = 'ready' and new.status = 'transferred')
    ) then
      raise exception 'Invalid collection lead transition: % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger wpi_price_collection_tasks_updated_at
before update on public.wpi_price_collection_tasks
for each row execute function private.wpi_set_updated_at();

create trigger wpi_price_collection_tasks_transition_guard
before update on public.wpi_price_collection_tasks
for each row execute function private.wpi_guard_collection_task_transition();

create trigger wpi_price_collection_leads_updated_at
before update on public.wpi_price_collection_leads
for each row execute function private.wpi_set_updated_at();

create trigger wpi_price_collection_leads_transition_guard
before update on public.wpi_price_collection_leads
for each row execute function private.wpi_guard_collection_lead_transition();

create trigger wpi_price_collection_tasks_audit
after insert or update or delete on public.wpi_price_collection_tasks
for each row execute function private.wpi_audit_row_change();

create trigger wpi_price_collection_leads_audit
after insert or update or delete on public.wpi_price_collection_leads
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_price_collection_tasks enable row level security;
alter table public.wpi_price_collection_leads enable row level security;

create policy wpi_collection_tasks_read
on public.wpi_price_collection_tasks for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_collection_tasks_insert
on public.wpi_price_collection_tasks for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = auth.uid()
);

create policy wpi_collection_tasks_update
on public.wpi_price_collection_tasks for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_collection_leads_read
on public.wpi_price_collection_leads for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_collection_leads_insert
on public.wpi_price_collection_leads for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = auth.uid()
);

create policy wpi_collection_leads_update_writer
on public.wpi_price_collection_leads for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_collection_leads_update_reviewer
on public.wpi_price_collection_leads for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'))
with check (private.wpi_has_permission(organization_id, 'price.review'));

grant select, insert, update on public.wpi_price_collection_tasks to authenticated;
grant select, insert, update on public.wpi_price_collection_leads to authenticated;

create or replace function public.wpi_transition_price_collection_task(
  target_task_id uuid,
  requested_action text,
  next_progress smallint default null,
  next_success_count integer default null,
  next_failed_count integer default null,
  next_current_source text default null,
  next_error text default null
)
returns public.wpi_price_collection_tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_task public.wpi_price_collection_tasks;
  target_status text;
begin
  select * into current_task
  from public.wpi_price_collection_tasks
  where id = target_task_id
  for update;

  if current_task.id is null then
    raise exception 'Collection task not found';
  end if;

  target_status := case requested_action
    when 'start' then 'running'
    when 'pause' then 'paused'
    when 'resume' then 'running'
    when 'stop' then 'stopped'
    when 'complete' then 'completed'
    when 'fail' then 'failed'
    when 'progress' then current_task.status
    else null
  end;

  if target_status is null then
    raise exception 'Unsupported collection task action';
  end if;

  if requested_action = 'start' and current_task.status not in ('queued', 'failed', 'stopped') then
    raise exception 'Task cannot be started from status %', current_task.status;
  elsif requested_action = 'pause' and current_task.status <> 'running' then
    raise exception 'Only running tasks can be paused';
  elsif requested_action = 'resume' and current_task.status <> 'paused' then
    raise exception 'Only paused tasks can be resumed';
  elsif requested_action = 'stop' and current_task.status not in ('queued', 'running', 'paused') then
    raise exception 'Task cannot be stopped from status %', current_task.status;
  elsif requested_action in ('complete', 'fail', 'progress') and current_task.status <> 'running' then
    raise exception 'Task is not running';
  end if;

  update public.wpi_price_collection_tasks
  set status = target_status,
      progress = case
        when requested_action = 'complete' then 100
        else coalesce(next_progress, progress)
      end,
      success_count = coalesce(next_success_count, success_count),
      failed_count = coalesce(next_failed_count, failed_count),
      current_source = coalesce(next_current_source, current_source),
      last_error = case when requested_action = 'fail' then next_error else last_error end,
      started_at = case
        when requested_action = 'start' then coalesce(started_at, now())
        else started_at
      end,
      finished_at = case
        when requested_action in ('stop', 'complete', 'fail') then now()
        else finished_at
      end,
      updated_by = auth.uid()
  where id = target_task_id
  returning * into current_task;

  return current_task;
end;
$$;

create or replace function public.wpi_review_price_collection_lead(
  target_lead_id uuid,
  decision text,
  notes text default null
)
returns public.wpi_price_collection_leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_lead public.wpi_price_collection_leads;
begin
  select * into current_lead
  from public.wpi_price_collection_leads
  where id = target_lead_id
  for update;

  if current_lead.id is null then
    raise exception 'Collection lead not found';
  end if;
  if current_lead.status <> 'pending_review' then
    raise exception 'Only pending leads can be reviewed';
  end if;
  if decision not in ('confirm', 'reject') then
    raise exception 'Unsupported lead review decision';
  end if;
  if decision = 'reject' and nullif(trim(notes), '') is null then
    raise exception 'Review notes are required when rejecting a lead';
  end if;

  update public.wpi_price_collection_leads
  set status = case when decision = 'confirm' then 'ready' else 'rejected' end,
      review_notes = nullif(trim(notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_by = auth.uid()
  where id = target_lead_id
  returning * into current_lead;

  return current_lead;
end;
$$;

create or replace function public.wpi_transfer_price_collection_leads(
  target_lead_ids uuid[]
)
returns setof public.wpi_price_collection_leads
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if target_lead_ids is null or cardinality(target_lead_ids) = 0 then
    raise exception 'At least one lead is required';
  end if;
  if exists (
    select 1 from public.wpi_price_collection_leads
    where id = any(target_lead_ids) and status <> 'ready'
  ) then
    raise exception 'All leads must be confirmed before transfer';
  end if;

  return query
  update public.wpi_price_collection_leads
  set status = 'transferred',
      transferred_at = now(),
      updated_by = auth.uid()
  where id = any(target_lead_ids)
  returning *;
end;
$$;

revoke all on function public.wpi_transition_price_collection_task(
  uuid, text, smallint, integer, integer, text, text
) from public, anon;
revoke all on function public.wpi_review_price_collection_lead(uuid, text, text)
  from public, anon;
revoke all on function public.wpi_transfer_price_collection_leads(uuid[])
  from public, anon;

grant execute on function public.wpi_transition_price_collection_task(
  uuid, text, smallint, integer, integer, text, text
) to authenticated;
grant execute on function public.wpi_review_price_collection_lead(uuid, text, text)
  to authenticated;
grant execute on function public.wpi_transfer_price_collection_leads(uuid[])
  to authenticated;

;
