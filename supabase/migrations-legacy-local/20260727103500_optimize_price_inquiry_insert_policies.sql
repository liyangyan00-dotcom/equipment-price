alter policy wpi_equipment_insert
  on public.wpi_equipment_prices
  with check (
    private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission)
    and created_by = (select auth.uid())
  );

alter policy wpi_material_insert
  on public.wpi_material_prices
  with check (
    private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission)
    and created_by = (select auth.uid())
  );

alter policy wpi_inquiries_insert
  on public.wpi_inquiries
  with check (
    private.wpi_has_permission(organization_id, 'inquiry.write'::public.wpi_app_permission)
    and created_by = (select auth.uid())
  );
