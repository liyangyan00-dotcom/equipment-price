-- Technical/specification subpages contain the structured parameter tables
-- and must run ahead of ordinary product pages.
update public.wpi_equipment_collection_discoveries
set resource_type = 'catalog', updated_at = now()
where resource_type = 'product'
  and status = 'queued'
  and (
    resource_url ~* '/technical($|[/?#])'
    or resource_url ~* '/specifications?($|[/?#])'
  );
