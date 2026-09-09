alter table public.wpi_attachments
  add column if not exists attachment_code text;

create unique index if not exists wpi_attachments_org_code_key
  on public.wpi_attachments (organization_id, attachment_code)
  where attachment_code is not null;

create table if not exists public.wpi_attachment_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  attachment_id uuid not null references public.wpi_attachments(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 48),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (attachment_id, name)
);

create table if not exists public.wpi_attachment_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  attachment_id uuid not null references public.wpi_attachments(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 240),
  severity public.wpi_risk_level not null default 'medium',
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wpi_attachment_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  attachment_id uuid not null references public.wpi_attachments(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('confirmed', 'need_info', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.wpi_attachment_ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  attachment_id uuid not null references public.wpi_attachments(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'needs_review', 'failed')),
  provider text not null default 'rules-engine',
  model text not null default 'attachment-evidence-v1',
  input_snapshot jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  confidence numeric check (confidence between 0 and 100),
  risk_level public.wpi_risk_level,
  requires_human_review boolean not null default true,
  requested_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wpi_attachment_tags_attachment_idx
  on public.wpi_attachment_tags (attachment_id, created_at);
create index if not exists wpi_attachment_issues_attachment_idx
  on public.wpi_attachment_issues (attachment_id, status, created_at desc);
create index if not exists wpi_attachment_reviews_attachment_idx
  on public.wpi_attachment_reviews (attachment_id, created_at desc);
create index if not exists wpi_attachment_ai_runs_attachment_idx
  on public.wpi_attachment_ai_runs (attachment_id, created_at desc);

drop trigger if exists wpi_attachment_issues_updated_at on public.wpi_attachment_issues;
create trigger wpi_attachment_issues_updated_at
before update on public.wpi_attachment_issues
for each row execute function private.wpi_set_updated_at();

drop trigger if exists wpi_attachment_ai_runs_updated_at on public.wpi_attachment_ai_runs;
create trigger wpi_attachment_ai_runs_updated_at
before update on public.wpi_attachment_ai_runs
for each row execute function private.wpi_set_updated_at();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'wpi_attachment_tags',
    'wpi_attachment_issues',
    'wpi_attachment_reviews',
    'wpi_attachment_ai_runs'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_audit', target_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.wpi_audit_row_change()',
      target_table || '_audit',
      target_table
    );
  end loop;
end $$;

alter table public.wpi_attachment_tags enable row level security;
alter table public.wpi_attachment_issues enable row level security;
alter table public.wpi_attachment_reviews enable row level security;
alter table public.wpi_attachment_ai_runs enable row level security;

create policy wpi_attachment_tags_read on public.wpi_attachment_tags
for select to authenticated
using (private.wpi_has_permission(organization_id, 'file.read'));
create policy wpi_attachment_tags_write on public.wpi_attachment_tags
for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'file.write')
  and created_by = (select auth.uid())
);
create policy wpi_attachment_tags_delete on public.wpi_attachment_tags
for delete to authenticated
using (
  private.wpi_has_permission(organization_id, 'file.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

create policy wpi_attachment_issues_read on public.wpi_attachment_issues
for select to authenticated
using (private.wpi_has_permission(organization_id, 'file.read'));
create policy wpi_attachment_issues_insert on public.wpi_attachment_issues
for insert to authenticated
with check (
  (private.wpi_has_permission(organization_id, 'file.write')
    or private.wpi_has_permission(organization_id, 'price.review'))
  and created_by = (select auth.uid())
);
create policy wpi_attachment_issues_update on public.wpi_attachment_issues
for update to authenticated
using (
  private.wpi_has_permission(organization_id, 'file.write')
  or private.wpi_has_permission(organization_id, 'price.review')
)
with check (
  private.wpi_has_permission(organization_id, 'file.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

create policy wpi_attachment_reviews_read on public.wpi_attachment_reviews
for select to authenticated
using (private.wpi_has_permission(organization_id, 'file.read'));

create policy wpi_attachment_ai_runs_read on public.wpi_attachment_ai_runs
for select to authenticated
using (private.wpi_has_permission(organization_id, 'file.read'));
create policy wpi_attachment_ai_runs_insert on public.wpi_attachment_ai_runs
for insert to authenticated
with check (
  (private.wpi_has_permission(organization_id, 'file.write')
    or private.wpi_has_permission(organization_id, 'price.review'))
  and requested_by = (select auth.uid())
);
create policy wpi_attachment_ai_runs_update on public.wpi_attachment_ai_runs
for update to authenticated
using (
  private.wpi_has_permission(organization_id, 'file.write')
  or private.wpi_has_permission(organization_id, 'price.review')
)
with check (
  private.wpi_has_permission(organization_id, 'file.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

revoke all on
  public.wpi_attachment_tags,
  public.wpi_attachment_issues,
  public.wpi_attachment_reviews,
  public.wpi_attachment_ai_runs
from anon;

grant select, insert, delete on public.wpi_attachment_tags to authenticated;
grant select, insert, update on public.wpi_attachment_issues to authenticated;
grant select on public.wpi_attachment_reviews to authenticated;
grant select, insert, update on public.wpi_attachment_ai_runs to authenticated;

create or replace function public.wpi_record_attachment_access_event(
  target_attachment_id uuid,
  event_action text,
  event_data jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment_row public.wpi_attachments%rowtype;
  audit_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if event_action not in ('evidence.preview', 'evidence.download', 'evidence.export') then
    raise exception 'Unsupported attachment access action';
  end if;

  select * into attachment_row
  from public.wpi_attachments attachment
  where attachment.id = target_attachment_id;

  if attachment_row.id is null
    or not private.wpi_has_permission(attachment_row.organization_id, 'file.read') then
    raise exception 'Attachment not found or access denied';
  end if;

  insert into public.wpi_audit_logs (
    organization_id, actor_id, action, table_name, record_id, new_data, request_id
  ) values (
    attachment_row.organization_id,
    auth.uid(),
    event_action,
    'wpi_attachments',
    attachment_row.id::text,
    coalesce(event_data, '{}'::jsonb),
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id'
  ) returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function public.wpi_submit_attachment_review(
  target_attachment_id uuid,
  review_decision text,
  review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment_row public.wpi_attachments%rowtype;
  review_id uuid;
  next_verification_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if review_decision not in ('confirmed', 'need_info', 'rejected') then
    raise exception 'Unsupported attachment review decision';
  end if;

  select * into attachment_row
  from public.wpi_attachments attachment
  where attachment.id = target_attachment_id
  for update;

  if attachment_row.id is null then
    raise exception 'Attachment not found';
  end if;
  if not (
    private.wpi_has_permission(attachment_row.organization_id, 'price.review')
    or private.wpi_has_permission(attachment_row.organization_id, 'file.write')
  ) then
    raise exception 'Attachment review permission denied';
  end if;

  insert into public.wpi_attachment_reviews (
    organization_id, attachment_id, reviewer_id, decision, notes
  ) values (
    attachment_row.organization_id,
    attachment_row.id,
    auth.uid(),
    review_decision,
    nullif(btrim(review_notes), '')
  ) returning id into review_id;

  next_verification_status := case
    when review_decision = 'confirmed' then 'verified'
    when review_decision = 'rejected' then 'rejected'
    else 'pending'
  end;

  update public.wpi_attachments
  set
    verification_status = next_verification_status,
    verified_by = case when review_decision = 'confirmed' then auth.uid() else null end,
    verified_at = case when review_decision = 'confirmed' then now() else null end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_review_decision', review_decision,
      'last_review_notes', coalesce(review_notes, ''),
      'last_reviewed_at', now()
    )
  where id = attachment_row.id;

  return jsonb_build_object(
    'reviewId', review_id,
    'attachmentId', attachment_row.id,
    'verificationStatus', next_verification_status,
    'reviewedAt', now()
  );
end;
$$;

revoke all on function public.wpi_record_attachment_access_event(uuid, text, jsonb)
  from public, anon;
revoke all on function public.wpi_submit_attachment_review(uuid, text, text)
  from public, anon;
grant execute on function public.wpi_record_attachment_access_event(uuid, text, jsonb)
  to authenticated;
grant execute on function public.wpi_submit_attachment_review(uuid, text, text)
  to authenticated;

comment on column public.wpi_attachments.attachment_code is
  'Human-readable evidence code used by application routes; UUID remains the primary key.';
comment on table public.wpi_attachment_reviews is
  'Append-only human review decisions. AI output cannot directly verify an attachment.';

;
