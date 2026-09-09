drop policy if exists wpi_collection_tasks_delete on public.wpi_price_collection_tasks;
create policy wpi_collection_tasks_delete
on public.wpi_price_collection_tasks
for delete to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'));
grant delete on public.wpi_price_collection_tasks to authenticated;
