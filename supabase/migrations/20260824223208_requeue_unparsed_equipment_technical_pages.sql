-- Technical pages fetched before HTML-table extraction was available need one
-- controlled replay so their parameters can be attached to the parent item.
update public.wpi_equipment_collection_discoveries discovery
set
  status = 'queued',
  run_id = null,
  fetched_at = null,
  error_message = null,
  updated_at = now()
where discovery.resource_type = 'catalog'
  and discovery.status = 'fetched'
  and (
    discovery.resource_url ~* '/technical($|[/?#])'
    or discovery.resource_url ~* '/specifications?($|[/?#])'
  )
  and exists (
    select 1
    from public.wpi_equipment_catalog catalog
    where catalog.collection_task_id = discovery.task_id
      and catalog.review_status in ('draft', 'pending_review')
      and not exists (
        select 1
        from public.wpi_equipment_catalog_parameters parameter
        where parameter.equipment_catalog_id = catalog.id
      )
  );
