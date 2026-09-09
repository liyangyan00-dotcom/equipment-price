create table if not exists public.wpi_inquiry_letter_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  template_code text not null,
  name text not null,
  language text not null default 'zh-CN',
  config jsonb not null default '{}'::jsonb,
  content text not null,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_code)
);

create table if not exists public.wpi_inquiry_export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  export_format text not null check (export_format in ('word', 'pdf')),
  status text not null default 'requested' check (status in ('requested', 'completed', 'failed')),
  file_name text not null,
  bucket_id text,
  object_path text,
  error_message text,
  requested_by uuid not null references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wpi_inquiry_letter_templates_org_active_idx
  on public.wpi_inquiry_letter_templates (organization_id, updated_at desc)
  where is_active;

create index if not exists wpi_inquiry_export_jobs_inquiry_idx
  on public.wpi_inquiry_export_jobs (organization_id, inquiry_id, created_at desc);

alter table public.wpi_inquiry_letter_templates enable row level security;
alter table public.wpi_inquiry_export_jobs enable row level security;

create policy wpi_inquiry_letter_templates_read
  on public.wpi_inquiry_letter_templates for select to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.read'));

create policy wpi_inquiry_letter_templates_write
  on public.wpi_inquiry_letter_templates for insert to authenticated
  with check (
    private.wpi_has_permission(organization_id, 'inquiry.write')
    and created_by = auth.uid()
  );

create policy wpi_inquiry_letter_templates_update
  on public.wpi_inquiry_letter_templates for update to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'))
  with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_inquiry_letter_templates_delete
  on public.wpi_inquiry_letter_templates for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_inquiry_export_jobs_read
  on public.wpi_inquiry_export_jobs for select to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.read'));

create policy wpi_inquiry_export_jobs_write
  on public.wpi_inquiry_export_jobs for insert to authenticated
  with check (
    private.wpi_has_permission(organization_id, 'inquiry.write')
    and requested_by = auth.uid()
  );

create policy wpi_inquiry_export_jobs_update
  on public.wpi_inquiry_export_jobs for update to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'))
  with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

revoke all on public.wpi_inquiry_letter_templates from anon;
revoke all on public.wpi_inquiry_export_jobs from anon;
grant select, insert, update, delete on public.wpi_inquiry_letter_templates to authenticated;
grant select, insert, update on public.wpi_inquiry_export_jobs to authenticated;

drop trigger if exists wpi_inquiry_letter_templates_updated_at on public.wpi_inquiry_letter_templates;
create trigger wpi_inquiry_letter_templates_updated_at
before update on public.wpi_inquiry_letter_templates
for each row execute function private.wpi_set_updated_at();

drop trigger if exists wpi_inquiry_letter_templates_audit on public.wpi_inquiry_letter_templates;
create trigger wpi_inquiry_letter_templates_audit
after insert or update or delete on public.wpi_inquiry_letter_templates
for each row execute function private.wpi_audit_row_change();

drop trigger if exists wpi_inquiry_export_jobs_audit on public.wpi_inquiry_export_jobs;
create trigger wpi_inquiry_export_jobs_audit
after insert or update or delete on public.wpi_inquiry_export_jobs
for each row execute function private.wpi_audit_row_change();

comment on table public.wpi_inquiry_letter_templates is
  'Organization-scoped reusable inquiry letter templates. Final commercial decisions remain subject to human review.';

comment on table public.wpi_inquiry_export_jobs is
  'Auditable inquiry letter export requests and generated Storage objects.';
