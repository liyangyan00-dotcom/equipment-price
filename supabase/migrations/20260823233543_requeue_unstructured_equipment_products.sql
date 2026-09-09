-- Reprocess product pages collected before structured equipment extraction was enabled.
-- Pages already linked to a catalog candidate remain untouched.
update public.wpi_equipment_collection_discoveries as discovery
set
  status = 'queued',
  error_message = null,
  updated_at = timezone('utc', now())
where discovery.resource_type = 'product'
  and discovery.status = 'fetched'
  and not exists (
    select 1
    from public.wpi_equipment_catalog as catalog
    where catalog.source_discovery_id = discovery.id
  );
