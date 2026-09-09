alter table public.wpi_equipment_prices add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.wpi_material_prices add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.wpi_inquiry_items add column if not exists legacy_id text, add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.wpi_inquiry_suppliers add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists wpi_inquiry_items_organization_legacy_id_key on public.wpi_inquiry_items (organization_id, legacy_id) where legacy_id is not null;;
