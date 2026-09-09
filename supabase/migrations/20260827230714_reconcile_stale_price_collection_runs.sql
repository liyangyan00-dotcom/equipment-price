create or replace function public.wpi_reconcile_stale_price_collection_runs(
  stale_after interval default interval '10 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recovered_source_count integer := 0;
  failed_source_count integer := 0;
  refreshed_parent_count integer := 0;
  orphan_parent_count integer := 0;
  parent_id uuid;
begin
  if stale_after < interval '2 minutes' or stale_after > interval '24 hours' then
    raise exception 'stale_after must be between 2 minutes and 24 hours';
  end if;

  with recovered as (
    update public.wpi_price_collection_source_runs source_run
    set status = 'partial',
        progress = least(source_run.progress, 95),
        next_run_at = now(),
        finished_at = now(),
        error_message = coalesce(source_run.error_message, '来源任务心跳超时，已自动进入重试队列')
    where source_run.status = 'running'
      and source_run.updated_at <= now() - stale_after
      and source_run.attempt < source_run.max_retries
    returning 1
  )
  select count(*)::integer into recovered_source_count from recovered;

  with failed as (
    update public.wpi_price_collection_source_runs source_run
    set status = 'failed',
        progress = 100,
        finished_at = now(),
        error_message = coalesce(source_run.error_message, '来源任务已达到最大重试次数，系统自动终结')
    where (
        source_run.status = 'running'
        and source_run.updated_at <= now() - stale_after
        and source_run.attempt >= source_run.max_retries
      ) or (
        source_run.status in ('queued', 'partial')
        and source_run.next_run_at <= now() - stale_after
        and source_run.attempt >= source_run.max_retries
      )
    returning 1
  )
  select count(*)::integer into failed_source_count from failed;

  for parent_id in
    select distinct source_run.parent_run_id
    from public.wpi_price_collection_source_runs source_run
    join public.wpi_price_collection_runs parent_run on parent_run.id = source_run.parent_run_id
    where parent_run.status in ('queued', 'running', 'partial')
      and not exists (
        select 1
        from public.wpi_price_collection_source_runs active_run
        where active_run.parent_run_id = source_run.parent_run_id
          and active_run.status in ('queued', 'running', 'partial')
      )
  loop
    perform public.wpi_refresh_price_collection_parent_run(parent_id);
    refreshed_parent_count := refreshed_parent_count + 1;
  end loop;

  with orphaned as (
    update public.wpi_price_collection_runs parent_run
    set status = 'failed',
        progress = 100,
        error_message = coalesce(parent_run.error_message, '任务启动后未生成来源子任务，系统已自动终结'),
        current_source = '没有可执行的来源子任务',
        finished_at = now(),
        updated_at = now()
    where parent_run.status in ('queued', 'running', 'partial')
      and parent_run.updated_at <= now() - stale_after
      and not exists (
        select 1 from public.wpi_price_collection_source_runs source_run
        where source_run.parent_run_id = parent_run.id
      )
    returning parent_run.task_id
  ), failed_tasks as (
    update public.wpi_price_collection_tasks task
    set status = 'failed',
        progress = 100,
        current_source = '没有可执行的来源子任务',
        last_error = '任务启动后未生成来源子任务，系统已自动终结',
        finished_at = now()
    where task.status = 'running'
      and task.id in (select task_id from orphaned)
    returning 1
  )
  select count(*)::integer into orphan_parent_count from failed_tasks;

  return jsonb_build_object(
    'recoveredSourceRuns', recovered_source_count,
    'failedSourceRuns', failed_source_count,
    'refreshedParentRuns', refreshed_parent_count,
    'failedOrphanParentRuns', orphan_parent_count
  );
end;
$$;

revoke all on function public.wpi_reconcile_stale_price_collection_runs(interval)
from public, anon, authenticated;
grant execute on function public.wpi_reconcile_stale_price_collection_runs(interval)
to service_role;

comment on function public.wpi_reconcile_stale_price_collection_runs(interval) is
  'Recovers stale source workers, closes exhausted runs, and fails parent runs that never created source work.';;
