grant delete on table public.wpi_price_collection_leads to authenticated;

drop policy if exists wpi_collection_leads_delete on public.wpi_price_collection_leads;
create policy wpi_collection_leads_delete
on public.wpi_price_collection_leads
for delete
to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write'::wpi_app_permission)
  and status <> 'transferred'
);;
