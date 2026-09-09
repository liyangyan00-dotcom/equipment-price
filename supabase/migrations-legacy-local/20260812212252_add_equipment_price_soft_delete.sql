alter table public.wpi_equipment_prices
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deletion_reason text;

create index if not exists wpi_equipment_prices_active_org_updated_idx
  on public.wpi_equipment_prices (organization_id, updated_at desc)
  where deleted_at is null;

create index if not exists wpi_equipment_prices_deleted_by_idx
  on public.wpi_equipment_prices (deleted_by)
  where deleted_by is not null;

comment on column public.wpi_equipment_prices.deleted_at is
  'Soft deletion timestamp. Non-null rows are hidden from normal price-library queries.';
comment on column public.wpi_equipment_prices.deleted_by is
  'User who voided the equipment price record.';
comment on column public.wpi_equipment_prices.deletion_reason is
  'Required business reason for voiding an equipment price record.';
