create index if not exists wpi_collection_schedule_policies_created_by_idx
  on public.wpi_price_collection_schedule_policies (created_by)
  where created_by is not null;

create index if not exists wpi_collection_schedule_policies_updated_by_idx
  on public.wpi_price_collection_schedule_policies (updated_by)
  where updated_by is not null;

drop policy if exists wpi_price_collection_schedule_policies_write
on public.wpi_price_collection_schedule_policies;

create policy wpi_price_collection_schedule_policies_insert
on public.wpi_price_collection_schedule_policies
for insert to authenticated
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_price_collection_schedule_policies_update
on public.wpi_price_collection_schedule_policies
for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_price_collection_schedule_policies_delete
on public.wpi_price_collection_schedule_policies
for delete to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'));


