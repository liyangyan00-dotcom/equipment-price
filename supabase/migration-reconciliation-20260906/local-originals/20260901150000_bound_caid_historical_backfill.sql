-- The automatic parser is forward-looking. Keep the latest published CAID
-- month queued, while older reports remain searchable evidence and can be
-- selected explicitly for a controlled historical backfill.
update public.wpi_equipment_collection_discoveries as discovery
set
  status = 'tracked',
  run_id = null,
  error_message = null,
  metadata = coalesce(discovery.metadata, '{}'::jsonb) || jsonb_build_object(
    'trackedOnly', true,
    'parseStatus', 'archived',
    'historicalBackfillAvailable', true,
    'requiresHumanReview', true
  ),
  updated_at = now()
where discovery.resource_type = 'pdf'
  and discovery.status in ('queued', 'failed')
  and lower(discovery.resource_url) not like '%/lokole/juin_2026.pdf%'
  and exists (
    select 1
    from public.wpi_price_collection_sources as source
    where source.id = discovery.source_id
      and source.config ->> 'adapter' = 'caid_lokole_reports'
  );
