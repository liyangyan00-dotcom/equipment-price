-- P0: make collection outcomes truthful and keep formal price admission behind
-- a server-side evidence, FX, duplicate and freshness gate.

alter table public.wpi_price_collection_tasks
  add column if not exists outcome_status text not null default 'pending',
  add column if not exists qualified_lead_count integer not null default 0,
  add column if not exists catalog_candidate_count integer not null default 0,
  add column if not exists evidence_count integer not null default 0;

alter table public.wpi_price_collection_tasks
  drop constraint if exists wpi_price_collection_tasks_outcome_status_check,
  drop constraint if exists wpi_price_collection_tasks_qualified_lead_count_check,
  drop constraint if exists wpi_price_collection_tasks_catalog_candidate_count_check,
  drop constraint if exists wpi_price_collection_tasks_evidence_count_check;

alter table public.wpi_price_collection_tasks
  add constraint wpi_price_collection_tasks_outcome_status_check
    check (outcome_status in ('pending', 'qualified', 'partial', 'no_price', 'blocked')),
  add constraint wpi_price_collection_tasks_qualified_lead_count_check
    check (qualified_lead_count >= 0),
  add constraint wpi_price_collection_tasks_catalog_candidate_count_check
    check (catalog_candidate_count >= 0),
  add constraint wpi_price_collection_tasks_evidence_count_check
    check (evidence_count >= 0);

with task_counts as (
  select
    task.id,
    count(distinct lead.id) filter (
      where lead.price_validity_status = 'valid'
        and lead.duplicate_status = 'unique'
        and lead.risk_level <> 'critical'
        and exists (
          select 1
          from public.wpi_price_collection_evidence evidence
          where evidence.lead_id = lead.id
        )
        and (
          upper(lead.currency) = 'CNY'
          or (
            lead.fx_status = 'verified'
            and lead.normalized_price_cny > 0
          )
        )
    )::integer as qualified_count,
    count(distinct catalog.id)::integer as catalog_count,
    count(distinct evidence.id)::integer as evidence_count
  from public.wpi_price_collection_tasks task
  left join public.wpi_price_collection_leads lead on lead.task_id = task.id
  left join public.wpi_equipment_catalog catalog on catalog.collection_task_id = task.id
  left join public.wpi_price_collection_evidence evidence on evidence.task_id = task.id
  group by task.id
)
update public.wpi_price_collection_tasks task
set qualified_lead_count = task_counts.qualified_count,
    catalog_candidate_count = task_counts.catalog_count,
    evidence_count = task_counts.evidence_count,
    success_count = task_counts.qualified_count,
    outcome_status = case
      when task.status = 'failed' then 'blocked'
      when task_counts.qualified_count > 0 and task.failed_count > 0 then 'partial'
      when task_counts.qualified_count > 0 then 'qualified'
      when task.status = 'completed' then 'no_price'
      else 'pending'
    end,
    updated_at = now()
from task_counts
where task.id = task_counts.id;

create or replace function private.wpi_guard_price_lead_validity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('ready', 'transferred') then
    if new.price_validity_status <> 'valid' then
      raise exception '价格记录尚未通过字段有效性准入，不能确认或写入正式价格库';
    end if;
    if not exists (
      select 1
      from public.wpi_price_collection_evidence evidence
      where evidence.lead_id = new.id
    ) then
      raise exception '价格记录缺少可追溯来源证据，不能确认或写入正式价格库';
    end if;
    if upper(new.currency) <> 'CNY'
      and (new.fx_status <> 'verified' or coalesce(new.normalized_price_cny, 0) <= 0) then
      raise exception '外币价格尚未完成汇率核验，不能确认或写入正式价格库';
    end if;
    if new.duplicate_status <> 'unique' then
      raise exception '价格记录仍为疑似重复，请先完成人工去重';
    end if;
    if new.source_checked_at is null
      or new.source_checked_at < now() - interval '180 days' then
      raise exception '价格来源未核验或已超过 180 天有效期';
    end if;
    if new.risk_level = 'critical' then
      raise exception '严重风险价格不能直接确认或写入正式价格库';
    end if;
  end if;
  return new;
end;
$$;

-- Existing ready records created under the old, weaker gate must be reviewed again.
alter table public.wpi_price_collection_leads
  disable trigger wpi_price_collection_leads_transition_guard;

update public.wpi_price_collection_leads lead
set status = 'pending_review',
    review_notes = concat_ws(E'\n', nullif(lead.review_notes, ''), '系统P0治理：准入规则升级，需重新核验证据、汇率、重复项和来源有效期。'),
    reviewed_by = null,
    reviewed_at = null,
    updated_at = now()
where lead.status = 'ready'
  and (
    lead.price_validity_status <> 'valid'
    or not exists (
      select 1 from public.wpi_price_collection_evidence evidence where evidence.lead_id = lead.id
    )
    or (
      upper(lead.currency) <> 'CNY'
      and (lead.fx_status <> 'verified' or coalesce(lead.normalized_price_cny, 0) <= 0)
    )
    or lead.duplicate_status <> 'unique'
    or lead.source_checked_at is null
    or lead.source_checked_at < now() - interval '180 days'
    or lead.risk_level = 'critical'
  );

alter table public.wpi_price_collection_leads
  enable trigger wpi_price_collection_leads_transition_guard;

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
  if not private.wpi_has_permission(current_lead.organization_id, 'price.review') then
    raise exception 'Price review permission is required';
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

revoke all on function public.wpi_review_price_collection_lead(uuid, text, text)
  from public, anon;
grant execute on function public.wpi_review_price_collection_lead(uuid, text, text)
  to authenticated;

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
  qualified_count integer := 0;
  catalog_count integer := 0;
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

  select count(*)::integer into qualified_count
  from public.wpi_price_collection_leads lead
  where lead.task_id = parent_row.task_id
    and lead.price_validity_status = 'valid'
    and lead.duplicate_status = 'unique'
    and lead.risk_level <> 'critical'
    and exists (
      select 1 from public.wpi_price_collection_evidence evidence where evidence.lead_id = lead.id
    )
    and (
      upper(lead.currency) = 'CNY'
      or (lead.fx_status = 'verified' and lead.normalized_price_cny > 0)
    );

  select count(*)::integer into catalog_count
  from public.wpi_equipment_catalog catalog
  where catalog.collection_task_id = parent_row.task_id;

  update public.wpi_price_collection_tasks
  set status = case
        when next_status = 'running' then 'running'
        when next_status in ('completed', 'partial') then 'completed'
        else 'failed'
      end,
      progress = next_progress,
      success_count = qualified_count,
      qualified_lead_count = qualified_count,
      catalog_candidate_count = catalog_count,
      evidence_count = aggregate_row.evidence_count,
      outcome_status = case
        when next_status = 'running' then 'pending'
        when next_status = 'failed' then 'blocked'
        when qualified_count > 0 and aggregate_row.failed_count > 0 then 'partial'
        when qualified_count > 0 then 'qualified'
        else 'no_price'
      end,
      failed_count = aggregate_row.failed_count,
      current_source = case
        when next_status <> 'running' and qualified_count = 0
          then source_summary || ' · 未形成合格价格候选'
        else source_summary
      end,
      last_error = aggregate_row.errors,
      finished_at = case when aggregate_row.active_count = 0 then now() else null end
  where id = parent_row.task_id;

  return parent_row;
end;
$$;

revoke all on function public.wpi_refresh_price_collection_parent_run(uuid)
  from public, anon, authenticated;
grant execute on function public.wpi_refresh_price_collection_parent_run(uuid)
  to service_role;

comment on column public.wpi_price_collection_tasks.outcome_status is
  'Business outcome of a collection task; page discovery alone never counts as a qualified price.';
comment on column public.wpi_price_collection_tasks.qualified_lead_count is
  'Number of valid, evidenced, FX-verified, non-duplicate price leads produced by the task.';


