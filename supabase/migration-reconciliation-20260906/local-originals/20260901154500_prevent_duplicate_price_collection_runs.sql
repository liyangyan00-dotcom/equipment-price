create or replace function public.wpi_claim_due_price_collection_tasks(batch_size integer default 5)
returns setof public.wpi_price_collection_tasks
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select task.id
    from public.wpi_price_collection_tasks task
    where task.collection_mode in ('web', 'api')
      and coalesce(task.next_run_at, now()) <= now()
      and not exists (
        select 1
        from public.wpi_price_collection_source_runs source_run
        where source_run.task_id = task.id
          and source_run.status in ('queued', 'running', 'partial')
      )
      and (
        (
          task.schedule_enabled
          and task.status in ('queued', 'completed', 'failed', 'stopped')
          and (task.status <> 'failed' or task.retry_count < task.max_retries)
        )
        or (
          task.status = 'queued'
          and exists (
            select 1
            from public.wpi_equipment_collection_discoveries discovery
            where discovery.task_id = task.id
              and discovery.status = 'queued'
          )
        )
        or (
          task.status = 'running'
          and task.updated_at < now() - interval '3 minutes'
          and exists (
            select 1
            from public.wpi_equipment_collection_discoveries discovery
            where discovery.task_id = task.id
              and discovery.status = 'queued'
          )
        )
      )
    order by task.next_run_at nulls first
    for update skip locked
    limit greatest(1, least(batch_size, 20))
  ), closed_runs as (
    update public.wpi_price_collection_runs run
    set status = 'partial',
        error_message = coalesce(run.error_message, '上一批执行超过运行时限，系统已自动续跑'),
        finished_at = coalesce(run.finished_at, now())
    where run.task_id in (select id from due)
      and run.status = 'running'
      and run.updated_at < now() - interval '3 minutes'
    returning run.id
  )
  update public.wpi_price_collection_tasks task
  set status = 'queued',
      next_run_at = case
        when exists (
          select 1
          from public.wpi_equipment_collection_discoveries discovery
          where discovery.task_id = task.id
            and discovery.status = 'queued'
        ) then now() + interval '1 minute'
        else private.wpi_collection_next_run(task.frequency, now())
      end,
      last_run_at = now(),
      retry_at = null,
      last_error = case
        when task.status = 'running' then '上一批执行超时，已由调度器恢复'
        else task.last_error
      end
  from due
  where task.id = due.id
  returning task.*;
end;
$$;

revoke all on function public.wpi_claim_due_price_collection_tasks(integer)
from public, anon, authenticated;
grant execute on function public.wpi_claim_due_price_collection_tasks(integer)
to service_role;
