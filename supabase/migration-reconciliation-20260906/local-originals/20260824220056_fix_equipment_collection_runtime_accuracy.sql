-- One-off collection tasks still use the queued discovery backlog for
-- continuation. They must not remain marked as recurring schedules.
update public.wpi_price_collection_tasks task
set
  schedule_enabled = false,
  success_count = candidate.total,
  progress = greatest(task.progress, 3),
  updated_at = now()
from (
  select collection_task_id, count(*)::integer as total
  from public.wpi_equipment_catalog
  where collection_task_id is not null
  group by collection_task_id
) candidate
where task.id = candidate.collection_task_id
  and lower(coalesce(task.frequency, '')) in ('once', 'manual', 'single', '立即执行');
-- Keep the currently active one-off tasks accurate even before they have
-- produced their first candidate.
update public.wpi_price_collection_tasks
set schedule_enabled = false, updated_at = now()
where lower(coalesce(frequency, '')) in ('once', 'manual', 'single', '立即执行')
  and schedule_enabled = true;
