create table public.wpi_price_collection_source_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_id uuid not null references public.wpi_price_collection_tasks(id) on delete cascade,
  parent_run_id uuid not null references public.wpi_price_collection_runs(id) on delete cascade,
  source_id uuid not null references public.wpi_price_collection_sources(id) on delete cascade,
  source_name text not null,
  source_host text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  page_budget integer not null default 10 check (page_budget between 1 and 500),
  pages_used integer not null default 0 check (pages_used >= 0),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  created_lead_count integer not null default 0 check (created_lead_count >= 0),
  updated_lead_count integer not null default 0 check (updated_lead_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  attempt integer not null default 0 check (attempt between 0 and 20),
  max_retries integer not null default 3 check (max_retries between 0 and 10),
  next_run_at timestamptz not null default now(),
  current_resource text,
  error_message text,
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_run_id, source_id)
);

create index wpi_collection_source_runs_claim_idx
  on public.wpi_price_collection_source_runs(status, next_run_at, created_at)
  where status in ('queued', 'partial');
create index wpi_collection_source_runs_parent_idx
  on public.wpi_price_collection_source_runs(parent_run_id, created_at);
create index wpi_collection_source_runs_host_idx
  on public.wpi_price_collection_source_runs(organization_id, source_host, status);

create trigger wpi_collection_source_runs_updated_at
before update on public.wpi_price_collection_source_runs
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_price_collection_source_runs enable row level security;
create policy wpi_collection_source_runs_read on public.wpi_price_collection_source_runs
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_collection_source_runs_write on public.wpi_price_collection_source_runs
for all to authenticated using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

grant select, insert, update, delete on public.wpi_price_collection_source_runs to authenticated;
grant select, insert, update, delete on public.wpi_price_collection_source_runs to service_role;

create or replace function public.wpi_claim_due_price_collection_source_runs(batch_size integer default 3)
returns setof public.wpi_price_collection_source_runs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select source_run.id
    from public.wpi_price_collection_source_runs source_run
    where source_run.status in ('queued', 'partial')
      and source_run.next_run_at <= now()
      and source_run.attempt <= source_run.max_retries
      and not exists (
        select 1
        from public.wpi_price_collection_source_runs active_run
        where active_run.organization_id = source_run.organization_id
          and active_run.source_host = source_run.source_host
          and active_run.status = 'running'
      )
    order by source_run.next_run_at, source_run.created_at
    for update skip locked
    limit greatest(1, least(coalesce(batch_size, 3), 8))
  )
  update public.wpi_price_collection_source_runs source_run
  set status = 'running',
      attempt = source_run.attempt + 1,
      started_at = coalesce(source_run.started_at, now()),
      finished_at = null,
      error_message = null
  from candidates
  where source_run.id = candidates.id
  returning source_run.*;
end;
$$;

create or replace function public.wpi_refresh_price_collection_parent_run(target_parent_run_id uuid)
returns public.wpi_price_collection_runs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  aggregate_row record;
  parent_row public.wpi_price_collection_runs;
  next_status text;
  next_progress integer;
  source_summary text;
begin
  select
    count(*)::integer as total_count,
    count(*) filter (where status in ('queued', 'partial', 'running'))::integer as active_count,
    count(*) filter (where status = 'running')::integer as running_count,
    count(*) filter (where status = 'completed')::integer as completed_count,
    count(*) filter (where status = 'failed')::integer as failed_count,
    coalesce(round(avg(progress)), 0)::integer as average_progress,
    coalesce(sum(fetched_count), 0)::integer as fetched_count,
    coalesce(sum(evidence_count), 0)::integer as evidence_count,
    coalesce(sum(created_lead_count), 0)::integer as created_lead_count,
    coalesce(sum(updated_lead_count), 0)::integer as updated_lead_count,
    coalesce(sum(duplicate_count), 0)::integer as duplicate_count,
    string_agg(source_name, '、' order by source_name) filter (where status = 'running') as running_sources,
    string_agg(source_name || ': ' || left(coalesce(error_message, '采集失败'), 120), ' | ' order by source_name)
      filter (where status = 'failed') as errors
  into aggregate_row
  from public.wpi_price_collection_source_runs
  where parent_run_id = target_parent_run_id;

  if coalesce(aggregate_row.total_count, 0) = 0 then
    raise exception 'No source runs found for parent run %', target_parent_run_id;
  end if;

  next_progress := least(100, greatest(0, aggregate_row.average_progress));
  if aggregate_row.active_count > 0 then
    next_status := 'running';
    next_progress := least(95, next_progress);
  elsif aggregate_row.failed_count = aggregate_row.total_count then
    next_status := 'failed';
    next_progress := 100;
  elsif aggregate_row.failed_count > 0 then
    next_status := 'partial';
    next_progress := 100;
  else
    next_status := 'completed';
    next_progress := 100;
  end if;

  source_summary := coalesce(
    aggregate_row.running_sources,
    case when aggregate_row.active_count > 0
      then format('等待来源调度 · %s/%s 已完成', aggregate_row.completed_count, aggregate_row.total_count)
      else format('%s/%s 个来源已结束', aggregate_row.total_count, aggregate_row.total_count)
    end
  );

  update public.wpi_price_collection_runs
  set status = next_status,
      progress = next_progress,
      fetched_count = aggregate_row.fetched_count,
      created_lead_count = aggregate_row.created_lead_count,
      updated_lead_count = aggregate_row.updated_lead_count,
      duplicate_count = aggregate_row.duplicate_count,
      failed_source_count = aggregate_row.failed_count,
      current_source = source_summary,
      error_message = aggregate_row.errors,
      finished_at = case when aggregate_row.active_count = 0 then now() else null end,
      metrics = coalesce(metrics, '{}'::jsonb) || jsonb_build_object(
        'sourceRunCount', aggregate_row.total_count,
        'completedSourceCount', aggregate_row.completed_count,
        'runningSourceCount', aggregate_row.running_count,
        'evidenceCount', aggregate_row.evidence_count
      )
  where id = target_parent_run_id
  returning * into parent_row;

  update public.wpi_price_collection_tasks
  set status = case
        when next_status = 'running' then 'running'
        when next_status in ('completed', 'partial') then 'completed'
        else 'failed'
      end,
      progress = next_progress,
      success_count = aggregate_row.created_lead_count + aggregate_row.updated_lead_count,
      failed_count = aggregate_row.failed_count,
      current_source = source_summary,
      last_error = aggregate_row.errors,
      finished_at = case when aggregate_row.active_count = 0 then now() else null end
  where id = parent_row.task_id;

  return parent_row;
end;
$$;

revoke all on function public.wpi_claim_due_price_collection_source_runs(integer) from public, anon, authenticated;
grant execute on function public.wpi_claim_due_price_collection_source_runs(integer) to service_role;
revoke all on function public.wpi_refresh_price_collection_parent_run(uuid) from public, anon, authenticated;
grant execute on function public.wpi_refresh_price_collection_parent_run(uuid) to service_role;

alter table public.wpi_price_collection_leads
  add column if not exists original_name text,
  add column if not exists translated_name text,
  add column if not exists original_specification text,
  add column if not exists translated_specification text,
  add column if not exists translation_status text not null default 'queued'
    check (translation_status in ('not_required', 'queued', 'running', 'completed', 'needs_review', 'failed')),
  add column if not exists translation_confidence numeric(5,2)
    check (translation_confidence between 0 and 100),
  add column if not exists translation_risk_level text
    check (translation_risk_level in ('low', 'medium', 'high', 'critical')),
  add column if not exists translation_provider text,
  add column if not exists translation_model text,
  add column if not exists translation_review_status text not null default 'pending_review'
    check (translation_review_status in ('pending_review', 'approved', 'rejected')),
  add column if not exists translation_review_note text,
  add column if not exists translation_reviewed_by uuid references auth.users(id),
  add column if not exists translation_reviewed_at timestamptz,
  add column if not exists translation_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translation_metadata) = 'object');

update public.wpi_price_collection_leads
set original_name = coalesce(original_name, name),
    original_specification = coalesce(original_specification, specification),
    translation_status = case
      when coalesce(name, '') ~ '[一-龥]' then 'not_required'
      else 'queued'
    end,
    translated_name = case
      when coalesce(name, '') ~ '[一-龥]' then coalesce(translated_name, name)
      else translated_name
    end,
    translated_specification = case
      when coalesce(specification, '') ~ '[一-龥]' then coalesce(translated_specification, specification)
      else translated_specification
    end;

create index wpi_collection_leads_translation_queue_idx
  on public.wpi_price_collection_leads(translation_status, created_at)
  where translation_status in ('queued', 'failed');

;
