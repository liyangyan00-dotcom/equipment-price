
drop policy if exists wpi_collection_leads_insert on public.wpi_price_collection_leads;
create policy wpi_collection_leads_insert
  on public.wpi_price_collection_leads for insert to authenticated
  with check (
    private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission)
    and created_by = (select auth.uid())
  );
;
