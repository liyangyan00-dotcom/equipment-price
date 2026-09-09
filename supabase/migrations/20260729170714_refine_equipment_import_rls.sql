drop policy if exists wpi_equipment_import_rows_write on public.wpi_equipment_import_rows;
create policy wpi_equipment_import_rows_insert on public.wpi_equipment_import_rows for insert to authenticated with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_equipment_import_rows_update on public.wpi_equipment_import_rows for update to authenticated using (private.wpi_has_permission(organization_id, 'price.write')) with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_equipment_import_rows_delete on public.wpi_equipment_import_rows for delete to authenticated using (private.wpi_has_permission(organization_id, 'price.write'));
drop policy if exists wpi_import_field_mappings_write on public.wpi_import_field_mappings;
create policy wpi_import_field_mappings_insert on public.wpi_import_field_mappings for insert to authenticated with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_import_field_mappings_update on public.wpi_import_field_mappings for update to authenticated using (private.wpi_has_permission(organization_id, 'price.write')) with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_import_field_mappings_delete on public.wpi_import_field_mappings for delete to authenticated using (private.wpi_has_permission(organization_id, 'price.write'));;
