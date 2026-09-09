create index if not exists wpi_equipment_prices_supplier_id_idx
  on public.wpi_equipment_prices (supplier_id);

create index if not exists wpi_equipment_prices_created_by_idx
  on public.wpi_equipment_prices (created_by);

create index if not exists wpi_equipment_prices_updated_by_idx
  on public.wpi_equipment_prices (updated_by);

create index if not exists wpi_material_prices_supplier_id_idx
  on public.wpi_material_prices (supplier_id);

create index if not exists wpi_material_prices_created_by_idx
  on public.wpi_material_prices (created_by);

create index if not exists wpi_material_prices_updated_by_idx
  on public.wpi_material_prices (updated_by);

create index if not exists wpi_inquiries_created_by_idx
  on public.wpi_inquiries (created_by);

create index if not exists wpi_inquiries_updated_by_idx
  on public.wpi_inquiries (updated_by);

create index if not exists wpi_inquiry_items_inquiry_id_idx
  on public.wpi_inquiry_items (inquiry_id);

create index if not exists wpi_inquiry_suppliers_organization_id_idx
  on public.wpi_inquiry_suppliers (organization_id);

create index if not exists wpi_inquiry_suppliers_supplier_id_idx
  on public.wpi_inquiry_suppliers (supplier_id);
