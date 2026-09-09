create or replace function private.wpi_collection_next_run(
  frequency text,
  from_time timestamptz default now()
)
returns timestamptz
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case lower(coalesce(frequency, 'manual'))
    when 'hourly' then date_trunc('hour', from_time) + interval '1 hour'
    when '每小时' then date_trunc('hour', from_time) + interval '1 hour'
    when 'daily' then date_trunc('day', from_time) + interval '1 day 2 hours'
    when '每天' then date_trunc('day', from_time) + interval '1 day 2 hours'
    when 'weekly' then date_trunc('week', from_time) + interval '1 week 2 hours'
    when '每周' then date_trunc('week', from_time) + interval '1 week 2 hours'
    else null
  end;
$$;

update public.wpi_price_collection_tasks
set next_run_at = private.wpi_collection_next_run(frequency, now()),
    updated_at = now()
where schedule_enabled
  and collection_mode in ('web', 'api')
  and frequency in ('hourly', '每小时', 'daily', '每天', 'weekly', '每周');
