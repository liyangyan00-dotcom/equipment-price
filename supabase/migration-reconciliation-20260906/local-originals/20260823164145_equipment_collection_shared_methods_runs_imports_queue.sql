create table public.wpi_equipment_collection_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  method_code text not null,
  name text not null,
  applicable_source_types text[] not null default '{}',
  parse_target text not null default 'webpage'
    check (parse_target in ('webpage', 'pdf', 'excel', 'manual', 'mixed')),
  ai_enabled boolean not null default true,
  dedupe_enabled boolean not null default true,
  standardization_enabled boolean not null default true,
  retry_enabled boolean not null default true,
  max_retry smallint not null default 3 check (max_retry between 0 and 10),
  review_required boolean not null default true,
  scheduled boolean not null default true,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, method_code),
  unique (organization_id, name)
);
create table public.wpi_equipment_source_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  batch_code text not null,
  file_name text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'partial', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  success_rows integer not null default 0 check (success_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (organization_id, batch_code)
);
create table public.wpi_collection_source_validation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  source_id uuid not null references public.wpi_price_collection_sources(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  attempt smallint not null default 0 check (attempt between 0 and 10),
  requested_by uuid not null references auth.users(id),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wpi_collection_methods_org_active_idx
  on public.wpi_equipment_collection_methods(organization_id, is_active, name);
create index wpi_source_import_batches_org_created_idx
  on public.wpi_equipment_source_import_batches(organization_id, created_at desc);
create index wpi_source_validation_jobs_queue_idx
  on public.wpi_collection_source_validation_jobs(organization_id, status, created_at)
  where status in ('queued', 'running');
create unique index wpi_source_validation_jobs_open_unique_idx
  on public.wpi_collection_source_validation_jobs(organization_id, source_id)
  where status in ('queued', 'running');
create trigger wpi_collection_methods_updated_at
before update on public.wpi_equipment_collection_methods
for each row execute function private.wpi_set_updated_at();
create trigger wpi_source_validation_jobs_updated_at
before update on public.wpi_collection_source_validation_jobs
for each row execute function private.wpi_set_updated_at();
create trigger wpi_collection_methods_audit
after insert or update or delete on public.wpi_equipment_collection_methods
for each row execute function private.wpi_audit_row_change();
create trigger wpi_source_import_batches_audit
after insert or update or delete on public.wpi_equipment_source_import_batches
for each row execute function private.wpi_audit_row_change();
create trigger wpi_source_validation_jobs_audit
after insert or update or delete on public.wpi_collection_source_validation_jobs
for each row execute function private.wpi_audit_row_change();
alter table public.wpi_equipment_collection_methods enable row level security;
alter table public.wpi_equipment_source_import_batches enable row level security;
alter table public.wpi_collection_source_validation_jobs enable row level security;
create policy wpi_collection_methods_read on public.wpi_equipment_collection_methods
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_collection_methods_write on public.wpi_equipment_collection_methods
for all to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_source_import_batches_read on public.wpi_equipment_source_import_batches
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_source_import_batches_write on public.wpi_equipment_source_import_batches
for all to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_source_validation_jobs_read on public.wpi_collection_source_validation_jobs
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_source_validation_jobs_write on public.wpi_collection_source_validation_jobs
for all to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (private.wpi_has_permission(organization_id, 'settings.manage'));
grant select, insert, update, delete on public.wpi_equipment_collection_methods to authenticated, service_role;
grant select, insert, update, delete on public.wpi_equipment_source_import_batches to authenticated, service_role;
grant select, insert, update, delete on public.wpi_collection_source_validation_jobs to authenticated, service_role;
insert into public.wpi_equipment_collection_methods (
  organization_id, method_code, name, applicable_source_types, parse_target,
  ai_enabled, dedupe_enabled, standardization_enabled, retry_enabled, max_retry,
  review_required, scheduled, is_active, config, created_by, updated_by
)
select
  organization.id,
  seed.method_code,
  seed.name,
  seed.source_types,
  seed.parse_target,
  seed.ai_enabled,
  true,
  true,
  seed.retry_enabled,
  seed.max_retry,
  true,
  seed.scheduled,
  true,
  jsonb_build_object('requiresHumanReview', true, 'aiFinalDecision', false, 'seeded', true),
  member.user_id,
  member.user_id
from public.wpi_organizations organization
cross join lateral (
  select organization_member.user_id
  from public.wpi_organization_members organization_member
  where organization_member.organization_id = organization.id
    and organization_member.is_active = true
  order by organization_member.joined_at
  limit 1
) member
cross join (
  values
    ('MTH-WEB', '官网网页采集', array['manufacturer_site','supplier_site']::text[], 'webpage', true, true, 3, true),
    ('MTH-PDF', 'PDF样本解析', array['pdf_datasheet']::text[], 'pdf', true, true, 2, false),
    ('MTH-CATALOG', '产品目录解析', array['product_catalog']::text[], 'mixed', true, true, 3, true),
    ('MTH-EXCEL', 'Excel目录导入', array['excel_catalog']::text[], 'excel', true, false, 0, false),
    ('MTH-MANUAL', '人工录入', array['manual_input']::text[], 'manual', false, false, 0, false),
    ('MTH-HYBRID', '混合采集', array['api','manufacturer_site','product_catalog']::text[], 'mixed', true, true, 4, true)
) as seed(method_code, name, source_types, parse_target, ai_enabled, retry_enabled, max_retry, scheduled)
on conflict (organization_id, method_code) do nothing;
