-- Download-center pages are document discovery hubs. Process them before the
-- long product-page backlog so PDF evidence can enter the parsing pipeline.
update public.wpi_equipment_collection_discoveries
set resource_type = 'catalog', updated_at = now()
where resource_type = 'product'
  and status = 'queued'
  and (
    resource_url ~* '/downloads?($|[/?#])'
    or resource_url ~* '/documents?($|[/?#])'
  );
-- Older JSON-LD category breadcrumbs were stored as the equipment name and
-- type. Keep only the leaf label; brand + model continue to identify records.
update public.wpi_equipment_catalog
set
  equipment_name = btrim(regexp_replace(equipment_name, '^.*\s>\s', '')),
  normalized_name = lower(btrim(regexp_replace(equipment_name, '^.*\s>\s', ''))),
  equipment_type = btrim(regexp_replace(equipment_type, '^.*\s>\s', '')),
  updated_at = now()
where equipment_name like '% > %'
  and collection_task_id is not null;
