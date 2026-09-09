create index wpi_collection_tasks_created_by_idx
  on public.wpi_price_collection_tasks(created_by);
create index wpi_collection_tasks_updated_by_idx
  on public.wpi_price_collection_tasks(updated_by)
  where updated_by is not null;
create index wpi_collection_leads_created_by_idx
  on public.wpi_price_collection_leads(created_by);
create index wpi_collection_leads_updated_by_idx
  on public.wpi_price_collection_leads(updated_by)
  where updated_by is not null;
create index wpi_collection_leads_reviewed_by_idx
  on public.wpi_price_collection_leads(reviewed_by)
  where reviewed_by is not null;

drop policy if exists wpi_collection_leads_update_writer
  on public.wpi_price_collection_leads;
drop policy if exists wpi_collection_leads_update_reviewer
  on public.wpi_price_collection_leads;

create policy wpi_collection_leads_update
on public.wpi_price_collection_leads for update to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
)
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);
