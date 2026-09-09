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
    coalesce(sum(updated_lead_count), 0)::integer as updated_count,
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
      updated_lead_count = aggregate_row.updated_count,
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
      finished_at = case when aggregate_row.active_count = 0 then now() else null end,
      next_run_at = case
        when aggregate_row.active_count > 0 then next_run_at
        when schedule_enabled then private.wpi_collection_next_run(frequency, now())
        else null
      end
  where id = parent_row.task_id;

  return parent_row;
end;
$$;

revoke all on function public.wpi_refresh_price_collection_parent_run(uuid)
  from public, anon, authenticated;
grant execute on function public.wpi_refresh_price_collection_parent_run(uuid)
  to service_role;
