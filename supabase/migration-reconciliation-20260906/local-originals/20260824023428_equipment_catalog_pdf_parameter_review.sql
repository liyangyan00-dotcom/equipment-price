create table public.wpi_equipment_catalog_document_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  source_id uuid references public.wpi_equipment_catalog_sources(id) on delete set null,
  document_url text not null,
  file_name text not null default '',
  mime_type text not null default 'application/pdf',
  status text not null default 'queued'
    check (status in ('queued','running','needs_review','completed','failed','cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  page_count integer check (page_count is null or page_count > 0),
  parameter_count integer not null default 0 check (parameter_count >= 0),
  provider text,
  model text,
  gateway_run_id uuid references public.wpi_ai_gateway_runs(id) on delete set null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  requested_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.wpi_equipment_catalog_parameter_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  job_id uuid not null references public.wpi_equipment_catalog_document_jobs(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  parameter_code text not null,
  parameter_name text not null,
  parameter_group text not null default 'other',
  current_value text,
  current_unit text,
  proposed_value text not null,
  proposed_unit text,
  difference_type text not null default 'new'
    check (difference_type in ('new','changed','same','conflict')),
  source_page integer not null check (source_page > 0),
  bounding_box jsonb not null default '{}'::jsonb check (jsonb_typeof(bounding_box) = 'object'),
  source_text text not null default '',
  source_url text not null,
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'medium',
  review_decision text not null default 'pending'
    check (review_decision in ('pending','accepted','rejected')),
  review_note text not null default '',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, parameter_code)
);
create index wpi_equipment_catalog_document_jobs_catalog_idx
  on public.wpi_equipment_catalog_document_jobs(equipment_catalog_id, created_at desc);
create index wpi_equipment_catalog_document_jobs_status_idx
  on public.wpi_equipment_catalog_document_jobs(organization_id, status, created_at desc);
create index wpi_equipment_catalog_parameter_candidates_review_idx
  on public.wpi_equipment_catalog_parameter_candidates(equipment_catalog_id, review_decision, created_at desc);
create trigger wpi_equipment_catalog_document_jobs_updated_at
before update on public.wpi_equipment_catalog_document_jobs
for each row execute function private.wpi_set_updated_at();
create trigger wpi_equipment_catalog_parameter_candidates_updated_at
before update on public.wpi_equipment_catalog_parameter_candidates
for each row execute function private.wpi_set_updated_at();
create trigger wpi_equipment_catalog_document_jobs_audit
after insert or update or delete on public.wpi_equipment_catalog_document_jobs
for each row execute function private.wpi_audit_row_change();
create trigger wpi_equipment_catalog_parameter_candidates_audit
after insert or update or delete on public.wpi_equipment_catalog_parameter_candidates
for each row execute function private.wpi_audit_row_change();
alter table public.wpi_equipment_catalog_document_jobs enable row level security;
alter table public.wpi_equipment_catalog_parameter_candidates enable row level security;
create policy wpi_equipment_catalog_document_jobs_read
on public.wpi_equipment_catalog_document_jobs for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_equipment_catalog_document_jobs_insert
on public.wpi_equipment_catalog_document_jobs for insert to authenticated
with check (private.wpi_has_permission(organization_id, 'price.write') and requested_by = (select auth.uid()));
create policy wpi_equipment_catalog_document_jobs_update
on public.wpi_equipment_catalog_document_jobs for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_equipment_catalog_parameter_candidates_read
on public.wpi_equipment_catalog_parameter_candidates for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_equipment_catalog_parameter_candidates_insert
on public.wpi_equipment_catalog_parameter_candidates for insert to authenticated
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_equipment_catalog_parameter_candidates_update
on public.wpi_equipment_catalog_parameter_candidates for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'))
with check (private.wpi_has_permission(organization_id, 'price.review'));
revoke all on public.wpi_equipment_catalog_document_jobs from public, anon;
revoke all on public.wpi_equipment_catalog_parameter_candidates from public, anon;
grant select, insert, update on public.wpi_equipment_catalog_document_jobs to authenticated;
grant select, insert, update on public.wpi_equipment_catalog_parameter_candidates to authenticated;
grant all on public.wpi_equipment_catalog_document_jobs to service_role;
grant all on public.wpi_equipment_catalog_parameter_candidates to service_role;
comment on table public.wpi_equipment_catalog_document_jobs is
  '设备资料 PDF/图片解析运行账本；解析结果只进入候选层。';
comment on table public.wpi_equipment_catalog_parameter_candidates is
  '参数级证据定位与差异审核候选；人工接受后才写入正式参数。';
