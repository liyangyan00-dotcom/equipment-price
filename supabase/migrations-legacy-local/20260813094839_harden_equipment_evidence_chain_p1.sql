alter table public.wpi_attachments
  add column if not exists status text not null default 'active',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists description text,
  add column if not exists document_date date,
  add column if not exists valid_until date,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text,
  add column if not exists updated_at timestamptz not null default now();

update public.wpi_attachments
set evidence_type = 'quote_evidence'
where evidence_type is null or btrim(evidence_type) = '';

alter table public.wpi_attachments
  alter column evidence_type set default 'quote_evidence',
  alter column evidence_type set not null;

alter table public.wpi_attachments
  drop constraint if exists wpi_attachments_status_check,
  add constraint wpi_attachments_status_check
    check (status in ('active', 'archived')),
  drop constraint if exists wpi_attachments_verification_status_check,
  add constraint wpi_attachments_verification_status_check
    check (verification_status in ('pending', 'verified', 'rejected')),
  drop constraint if exists wpi_attachments_evidence_type_check,
  add constraint wpi_attachments_evidence_type_check
    check (evidence_type in (
      'quote_evidence',
      'technical_spec',
      'supplier_qualification',
      'delivery_terms',
      'payment_terms',
      'inspection_certificate',
      'contract',
      'correspondence',
      'other'
    ));

create index if not exists wpi_attachments_active_relation_idx
  on public.wpi_attachments (organization_id, related_type, related_id, created_at desc)
  where status = 'active';

create index if not exists wpi_attachments_verified_by_idx
  on public.wpi_attachments (verified_by)
  where verified_by is not null;

create index if not exists wpi_attachments_archived_by_idx
  on public.wpi_attachments (archived_by)
  where archived_by is not null;

drop policy if exists wpi_attachments_update on public.wpi_attachments;
create policy wpi_attachments_update on public.wpi_attachments
for update to authenticated
using (private.wpi_has_permission(organization_id, 'file.write'))
with check (private.wpi_has_permission(organization_id, 'file.write'));

drop trigger if exists wpi_attachments_updated_at on public.wpi_attachments;
create trigger wpi_attachments_updated_at
before update on public.wpi_attachments
for each row execute function private.wpi_set_updated_at();

create or replace function private.wpi_guard_equipment_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_related_type text;
  target_related_id uuid;
  active_review_exists boolean;
  finalized_review_exists boolean;
begin
  target_related_type := coalesce(new.related_type, old.related_type);
  target_related_id := coalesce(new.related_id, old.related_id);

  if target_related_type is distinct from 'equipment_price'
    or target_related_id is null then
    return coalesce(new, old);
  end if;

  select
    coalesce(bool_or(review.status in ('pending', 'in_review')), false),
    coalesce(bool_or(review.status in ('approved', 'rejected', 'archived')), false)
  into active_review_exists, finalized_review_exists
  from public.wpi_equipment_price_reviews review
  where review.organization_id = coalesce(new.organization_id, old.organization_id)
    and review.equipment_price_id = target_related_id;

  if active_review_exists then
    raise exception 'Equipment price evidence is frozen while review is active';
  end if;
  if finalized_review_exists then
    raise exception 'Finalized equipment price evidence must be changed through a revision';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists wpi_attachments_guard_equipment_evidence
  on public.wpi_attachments;
create trigger wpi_attachments_guard_equipment_evidence
before insert or update or delete on public.wpi_attachments
for each row execute function private.wpi_guard_equipment_evidence_mutation();

comment on column public.wpi_attachments.verification_status is
  'Human verification state. AI suggestions must not set this to verified.';
comment on column public.wpi_attachments.status is
  'Evidence lifecycle state. Archived rows remain available for audit history.';
