create table if not exists public.wpi_inquiry_letter_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  source text not null default 'manual' check (source in ('ai', 'manual', 'restored')),
  language text not null default 'zh-CN',
  content text not null,
  config jsonb not null default '{}'::jsonb,
  change_summary text,
  ai_confidence numeric(5, 2) check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 100)),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (inquiry_id, version_number)
);

create index if not exists wpi_inquiry_letter_versions_org_inquiry_idx
  on public.wpi_inquiry_letter_versions (organization_id, inquiry_id, version_number desc);

alter table public.wpi_inquiry_letter_versions enable row level security;

create policy wpi_inquiry_letter_versions_read
  on public.wpi_inquiry_letter_versions
  for select to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.read'));

create policy wpi_inquiry_letter_versions_insert
  on public.wpi_inquiry_letter_versions
  for insert to authenticated
  with check (
    private.wpi_has_permission(organization_id, 'inquiry.write')
    and created_by = auth.uid()
  );

revoke all on public.wpi_inquiry_letter_versions from anon;
grant select, insert on public.wpi_inquiry_letter_versions to authenticated;

drop trigger if exists wpi_inquiry_letter_versions_audit on public.wpi_inquiry_letter_versions;
create trigger wpi_inquiry_letter_versions_audit
after insert or update or delete on public.wpi_inquiry_letter_versions
for each row execute function private.wpi_audit_row_change();

