revoke execute on function public.wpi_search_price_collection_leads_v3(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, integer, integer
) from public, anon;

grant execute on function public.wpi_search_price_collection_leads_v3(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, integer, integer
) to authenticated, service_role;

update public.wpi_price_collection_tasks task
set frequency = '每周',
    schedule_enabled = true,
    schedule_expression = '0 2 * * 1',
    next_run_at = date_trunc('week', now()) + interval '1 week 2 hours',
    config = jsonb_set(
      coalesce(task.config, '{}'::jsonb),
      '{productionSchedule}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
where task.target_type = 'material'
  and task.collection_mode = 'web'
  and task.region = '刚果金全国 / DRC Nationwide'
  and coalesce((task.config ->> 'acceptanceTest')::boolean, false) = false
  and task.status in ('queued', 'completed', 'failed', 'stopped')
  and exists (
    select 1
    from public.wpi_price_collection_sources source
    where source.organization_id = task.organization_id
      and source.source_code = 'DRC_TALO_OFFICIAL'
      and source.is_active
      and task.config -> 'sourceIds' ? source.id::text
  )
  and exists (
    select 1
    from public.wpi_price_collection_sources source
    where source.organization_id = task.organization_id
      and source.source_code = 'DRC_CAID_LOKOLE'
      and source.is_active
      and task.config -> 'sourceIds' ? source.id::text
  );
