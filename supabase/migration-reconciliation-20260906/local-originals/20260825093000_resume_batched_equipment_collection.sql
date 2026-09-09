create or replace function private.wpi_guard_collection_task_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status and not (
    (old.status in ('queued', 'failed', 'stopped', 'completed') and new.status = 'running') or
    (old.status = 'running' and new.status in ('queued', 'paused', 'completed', 'stopped', 'failed')) or
    (old.status = 'paused' and new.status in ('running', 'stopped')) or
    (old.status in ('completed', 'failed', 'stopped') and new.status = 'queued')
  ) then
    raise exception 'Invalid collection task transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
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
          select 1 from public.wpi_equipment_collection_discoveries discovery
          where discovery.task_id = task.id and discovery.status = 'queued'
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
-- Repair the manufacturer created from hach.com.cn before compound-domain
-- parsing was supported, and put its timed-out task back into the queue.
update public.wpi_equipment_manufacturers
set brand = 'HACH',
    normalized_brand = 'hach',
    updated_at = now()
where website_url ilike '%hach.com.cn%'
  and upper(brand) = 'COM';
update public.wpi_price_collection_sources
set name = 'HACH 厂家官网',
    source_code = regexp_replace(source_code, 'MFR_COM_', 'MFR_HACH_'),
    config = jsonb_set(
      jsonb_set(config, '{brand}', '"HACH"'::jsonb, true),
      '{canonicalBrand}', '"HACH"'::jsonb, true
    ),
    updated_at = now()
where base_url ilike '%hach.com.cn%'
  and upper(coalesce(config->>'brand', '')) = 'COM';
update public.wpi_price_collection_runs run
set status = 'partial',
    error_message = coalesce(run.error_message, '上一批执行超过运行时限，系统将自动续跑'),
    finished_at = coalesce(run.finished_at, now())
from public.wpi_price_collection_tasks task
where run.task_id = task.id
  and task.task_code = 'COL-7601238713'
  and run.status = 'running';
update public.wpi_price_collection_tasks
set status = 'queued',
    progress = greatest(progress, 3),
    current_source = '等待自动续跑 · 已发现 323 条资源',
    next_run_at = now(),
    last_error = '首次运行超过 Edge Function 时限，已恢复为分批自动续跑',
    config = jsonb_set(config, '{brand}', '"HACH"'::jsonb, true),
    updated_at = now()
where task_code = 'COL-7601238713'
  and status = 'running';
