create table public.wpi_equipment_manufacturers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  official_name text not null check (length(btrim(official_name)) between 1 and 180),
  local_name text not null default '',
  brand text not null check (length(btrim(brand)) between 1 and 120),
  normalized_brand text not null,
  website_url text,
  country_code text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'inactive')),
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, normalized_brand)
);
create index wpi_equipment_manufacturers_org_status_idx
  on public.wpi_equipment_manufacturers (organization_id, status, official_name);
create trigger wpi_equipment_manufacturers_updated_at
before update on public.wpi_equipment_manufacturers
for each row execute function private.wpi_set_updated_at();
create trigger wpi_equipment_manufacturers_audit
after insert or update or delete on public.wpi_equipment_manufacturers
for each row execute function private.wpi_audit_row_change();
alter table public.wpi_equipment_manufacturers enable row level security;
create policy wpi_equipment_manufacturers_read
on public.wpi_equipment_manufacturers for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_equipment_manufacturers_insert
on public.wpi_equipment_manufacturers for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = (select auth.uid())
);
create policy wpi_equipment_manufacturers_update
on public.wpi_equipment_manufacturers for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_equipment_manufacturers_delete
on public.wpi_equipment_manufacturers for delete to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'));
grant select, insert, update, delete on public.wpi_equipment_manufacturers
to authenticated, service_role;
insert into public.wpi_equipment_manufacturers (
  organization_id, official_name, brand, normalized_brand, status,
  metadata, created_by, updated_by
)
select
  catalog.organization_id,
  coalesce(nullif(max(catalog.manufacturer), ''), catalog.brand),
  catalog.brand,
  lower(regexp_replace(catalog.brand, '[[:space:]·•()（）._-]+', '', 'g')),
  'pending',
  jsonb_build_object('backfilledFrom', 'wpi_equipment_catalog'),
  min(catalog.created_by::text)::uuid,
  min(coalesce(catalog.updated_by, catalog.created_by)::text)::uuid
from public.wpi_equipment_catalog catalog
where btrim(catalog.brand) <> ''
group by catalog.organization_id, catalog.brand
on conflict (organization_id, normalized_brand) do nothing;
