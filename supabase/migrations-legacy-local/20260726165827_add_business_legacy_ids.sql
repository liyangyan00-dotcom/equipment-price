alter table public.wpi_suppliers
  add column if not exists legacy_id text;

alter table public.wpi_equipment_prices
  add column if not exists legacy_id text;

alter table public.wpi_material_prices
  add column if not exists legacy_id text;

alter table public.wpi_inquiries
  add column if not exists legacy_id text;

alter table public.wpi_projects
  add column if not exists legacy_id text;

alter table public.wpi_reports
  add column if not exists legacy_id text;

create unique index if not exists wpi_suppliers_organization_legacy_id_key
  on public.wpi_suppliers (organization_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists wpi_equipment_prices_organization_legacy_id_key
  on public.wpi_equipment_prices (organization_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists wpi_material_prices_organization_legacy_id_key
  on public.wpi_material_prices (organization_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists wpi_inquiries_organization_legacy_id_key
  on public.wpi_inquiries (organization_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists wpi_projects_organization_legacy_id_key
  on public.wpi_projects (organization_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists wpi_reports_organization_legacy_id_key
  on public.wpi_reports (organization_id, legacy_id)
  where legacy_id is not null;
