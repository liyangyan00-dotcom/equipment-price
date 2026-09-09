create table public.wpi_equipment_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  batch_code text not null,
  file_name text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  sheet_name text not null default 'Sheet1',
  header_row integer not null default 1 check (header_row > 0),
  status text not null default 'draft'
    check (status in (
      'draft',
      'uploaded',
      'parsing',
      'mapping',
      'validating',
      'needs_review',
      'importing',
      'completed',
      'failed',
      'cancelled'
    )),
  current_step integer not null default 1 check (current_step between 1 and 4),
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  warning_rows integer not null default 0 check (warning_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  needs_review_rows integer not null default 0 check (needs_review_rows >= 0),
  selected_rows integer not null default 0 check (selected_rows >= 0),
  mapping_confidence numeric(5,2) check (mapping_confidence between 0 and 100),
  source_metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, batch_code)
);

create table public.wpi_equipment_import_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  batch_id uuid not null references public.wpi_equipment_import_batches(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_status text not null default 'valid'
    check (validation_status in (
      'valid',
      'warning',
      'error',
      'duplicate',
      'ignored',
      'submitted',
      'imported'
    )),
  confidence numeric(5,2) check (confidence between 0 and 100),
  issues jsonb not null default '[]'::jsonb,
  is_selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create table public.wpi_import_field_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  batch_id uuid not null references public.wpi_equipment_import_batches(id) on delete cascade,
  source_field text not null,
  system_field text,
  sample_value text,
  confidence numeric(5,2) check (confidence between 0 and 100),
  mapping_status text not null default 'mapped'
    check (mapping_status in ('mapped', 'warning', 'unmapped')),
  is_required boolean not null default false,
  user_modified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, source_field)
);

create index wpi_equipment_import_batches_org_status_idx
  on public.wpi_equipment_import_batches(organization_id, status, created_at desc);
create index wpi_equipment_import_batches_creator_idx
  on public.wpi_equipment_import_batches(created_by, created_at desc);
create index wpi_equipment_import_rows_batch_status_idx
  on public.wpi_equipment_import_rows(batch_id, validation_status, row_number);
create index wpi_equipment_import_rows_org_idx
  on public.wpi_equipment_import_rows(organization_id);
create index wpi_import_field_mappings_batch_idx
  on public.wpi_import_field_mappings(batch_id);
create index wpi_import_field_mappings_org_idx
  on public.wpi_import_field_mappings(organization_id);

create trigger wpi_equipment_import_batches_updated_at
before update on public.wpi_equipment_import_batches
for each row execute function private.wpi_set_updated_at();

create trigger wpi_equipment_import_rows_updated_at
before update on public.wpi_equipment_import_rows
for each row execute function private.wpi_set_updated_at();

create trigger wpi_import_field_mappings_updated_at
before update on public.wpi_import_field_mappings
for each row execute function private.wpi_set_updated_at();

create trigger wpi_equipment_import_batches_audit
after insert or update or delete on public.wpi_equipment_import_batches
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_equipment_import_batches enable row level security;
alter table public.wpi_equipment_import_rows enable row level security;
alter table public.wpi_import_field_mappings enable row level security;

create policy wpi_equipment_import_batches_read
on public.wpi_equipment_import_batches
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_equipment_import_batches_insert
on public.wpi_equipment_import_batches
for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = (select auth.uid())
);

create policy wpi_equipment_import_batches_update
on public.wpi_equipment_import_batches
for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_equipment_import_batches_delete
on public.wpi_equipment_import_batches
for delete to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write')
  and status in ('draft', 'uploaded', 'failed', 'cancelled')
);

create policy wpi_equipment_import_rows_read
on public.wpi_equipment_import_rows
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_equipment_import_rows_write
on public.wpi_equipment_import_rows
for all to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_import_field_mappings_read
on public.wpi_import_field_mappings
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_import_field_mappings_write
on public.wpi_import_field_mappings
for all to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

revoke all on public.wpi_equipment_import_batches from anon;
revoke all on public.wpi_equipment_import_rows from anon;
revoke all on public.wpi_import_field_mappings from anon;

grant select, insert, update, delete on public.wpi_equipment_import_batches to authenticated;
grant select, insert, update, delete on public.wpi_equipment_import_rows to authenticated;
grant select, insert, update, delete on public.wpi_import_field_mappings to authenticated;
