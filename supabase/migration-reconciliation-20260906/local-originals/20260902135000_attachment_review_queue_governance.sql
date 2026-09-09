alter table public.wpi_attachments
  add column if not exists review_state text not null default 'pending_ai',
  add column if not exists ai_status text not null default 'not_run',
  add column if not exists ai_confidence numeric(5,2),
  add column if not exists ai_risk_level public.wpi_risk_level,
  add column if not exists ai_analyzed_at timestamptz,
  add column if not exists assigned_reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists duplicate_of_attachment_id uuid references public.wpi_attachments(id) on delete set null,
  add column if not exists governance_flags text[] not null default '{}'::text[];

alter table public.wpi_attachments
  drop constraint if exists wpi_attachments_review_state_check,
  add constraint wpi_attachments_review_state_check
    check (review_state in ('pending_ai', 'pending_review', 'need_info', 'confirmed', 'rejected', 'voided')),
  drop constraint if exists wpi_attachments_ai_status_check,
  add constraint wpi_attachments_ai_status_check
    check (ai_status in ('not_run', 'running', 'needs_review', 'completed', 'failed')),
  drop constraint if exists wpi_attachments_ai_confidence_check,
  add constraint wpi_attachments_ai_confidence_check
    check (ai_confidence is null or ai_confidence between 0 and 100),
  drop constraint if exists wpi_attachments_not_self_duplicate_check,
  add constraint wpi_attachments_not_self_duplicate_check
    check (duplicate_of_attachment_id is null or duplicate_of_attachment_id <> id);

with latest_ai as (
  select distinct on (run.attachment_id)
    run.attachment_id,
    run.status,
    run.confidence,
    run.risk_level,
    run.completed_at
  from public.wpi_attachment_ai_runs run
  order by run.attachment_id, run.created_at desc
)
update public.wpi_attachments attachment
set ai_status = coalesce(latest_ai.status, 'not_run'),
    ai_confidence = latest_ai.confidence,
    ai_risk_level = latest_ai.risk_level,
    ai_analyzed_at = latest_ai.completed_at,
    review_state = case
      when attachment.status = 'archived' then 'voided'
      when attachment.verification_status = 'verified' then 'confirmed'
      when attachment.verification_status = 'rejected' then 'rejected'
      when attachment.metadata ->> 'last_review_decision' = 'need_info' then 'need_info'
      when latest_ai.attachment_id is not null then 'pending_review'
      else 'pending_ai'
    end,
    review_due_at = case
      when attachment.verification_status in ('verified', 'rejected') then null
      else coalesce(attachment.review_due_at, attachment.created_at + interval '2 days')
    end
from latest_ai
where latest_ai.attachment_id = attachment.id;

update public.wpi_attachments attachment
set review_state = case
      when attachment.status = 'archived' then 'voided'
      when attachment.verification_status = 'verified' then 'confirmed'
      when attachment.verification_status = 'rejected' then 'rejected'
      when attachment.metadata ->> 'last_review_decision' = 'need_info' then 'need_info'
      else 'pending_ai'
    end,
    review_due_at = case
      when attachment.verification_status in ('verified', 'rejected') then null
      else coalesce(attachment.review_due_at, attachment.created_at + interval '2 days')
    end
where not exists (
  select 1 from public.wpi_attachment_ai_runs run where run.attachment_id = attachment.id
);

with duplicate_candidates as (
  select attachment.id,
    first_value(attachment.id) over (
      partition by attachment.organization_id, attachment.checksum
      order by attachment.created_at, attachment.id
    ) as canonical_id
  from public.wpi_attachments attachment
  where attachment.checksum is not null and btrim(attachment.checksum) <> '' and attachment.status = 'active'
)
update public.wpi_attachments attachment
set duplicate_of_attachment_id = case when candidate.id = candidate.canonical_id then null else candidate.canonical_id end
from duplicate_candidates candidate
where attachment.id = candidate.id;

create index if not exists wpi_attachments_review_queue_idx
  on public.wpi_attachments (organization_id, review_state, review_due_at, created_at desc)
  where status = 'active';
create index if not exists wpi_attachments_assignee_idx
  on public.wpi_attachments (organization_id, assigned_reviewer_id, created_at desc)
  where status = 'active';
create index if not exists wpi_attachments_checksum_idx
  on public.wpi_attachments (organization_id, checksum, created_at)
  where checksum is not null and status = 'active';
create index if not exists wpi_attachments_duplicate_idx
  on public.wpi_attachments (duplicate_of_attachment_id)
  where duplicate_of_attachment_id is not null;

create or replace function private.wpi_prepare_attachment_queue_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.review_due_at is null and new.review_state not in ('confirmed', 'rejected', 'voided') then
    new.review_due_at := coalesce(new.created_at, now()) + interval '2 days';
  end if;

  if tg_op = 'INSERT' or new.checksum is distinct from old.checksum then
    if new.checksum is null or btrim(new.checksum) = '' then
      new.duplicate_of_attachment_id := null;
    else
      select attachment.id into new.duplicate_of_attachment_id
      from public.wpi_attachments attachment
      where attachment.organization_id = new.organization_id
        and attachment.checksum = new.checksum
        and attachment.status = 'active'
        and attachment.id <> new.id
      order by attachment.created_at, attachment.id
      limit 1;
    end if;
  end if;

  if tg_op = 'UPDATE'
    and (new.related_type is distinct from old.related_type or new.related_id is distinct from old.related_id)
    and old.review_state = 'confirmed' then
    new.review_state := case when new.ai_status in ('needs_review', 'completed') then 'pending_review' else 'pending_ai' end;
    new.verification_status := 'pending';
    new.verified_by := null;
    new.verified_at := null;
    new.review_due_at := now() + interval '2 days';
  end if;

  return new;
end;
$$;

drop trigger if exists wpi_attachments_prepare_queue_state on public.wpi_attachments;
create trigger wpi_attachments_prepare_queue_state
before insert or update of checksum, related_type, related_id on public.wpi_attachments
for each row execute function private.wpi_prepare_attachment_queue_state();

create or replace function public.wpi_set_attachment_relation(
  target_attachment_id uuid,
  target_related_type text,
  target_related_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment_row public.wpi_attachments%rowtype;
  relation_label text;
  relation_code text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select * into attachment_row
  from public.wpi_attachments attachment
  where attachment.id = target_attachment_id
  for update;

  if attachment_row.id is null then raise exception 'ATTACHMENT_NOT_FOUND'; end if;
  if not (
    private.wpi_has_permission(attachment_row.organization_id, 'file.write')
    or private.wpi_has_permission(attachment_row.organization_id, 'price.review')
  ) then raise exception 'ATTACHMENT_RELATION_PERMISSION_DENIED'; end if;

  case target_related_type
    when 'equipment_price' then
      select equipment.equipment_name, equipment.price_code into relation_label, relation_code
      from public.wpi_equipment_prices equipment
      where equipment.organization_id = attachment_row.organization_id and equipment.id = target_related_id;
    when 'material_price' then
      select material.material_name, material.price_code into relation_label, relation_code
      from public.wpi_material_prices material
      where material.organization_id = attachment_row.organization_id and material.id = target_related_id;
    when 'inquiry' then
      select inquiry.subject, inquiry.inquiry_code into relation_label, relation_code
      from public.wpi_inquiries inquiry
      where inquiry.organization_id = attachment_row.organization_id and inquiry.id = target_related_id;
    when 'project' then
      select project.name, project.project_code into relation_label, relation_code
      from public.wpi_projects project
      where project.organization_id = attachment_row.organization_id and project.id = target_related_id;
    when 'report' then
      select report.title, report.report_code into relation_label, relation_code
      from public.wpi_reports report
      where report.organization_id = attachment_row.organization_id and report.id = target_related_id;
    else
      raise exception 'ATTACHMENT_RELATION_TYPE_UNSUPPORTED';
  end case;

  if relation_label is null then raise exception 'ATTACHMENT_RELATION_TARGET_NOT_FOUND'; end if;

  update public.wpi_attachments attachment
  set related_type = target_related_type,
      related_id = target_related_id,
      metadata = coalesce(attachment.metadata, '{}'::jsonb) || jsonb_build_object(
        'object_label', relation_label,
        'price_code', coalesce(relation_code, '-'),
        'relation_updated_at', now(),
        'relation_updated_by', auth.uid()
      ),
      updated_at = now()
  where attachment.id = target_attachment_id;

  return jsonb_build_object('attachmentId', target_attachment_id, 'relatedType', target_related_type,
    'relatedId', target_related_id, 'label', relation_label, 'code', relation_code);
end;
$$;

create or replace function public.wpi_assign_attachments(
  target_attachment_ids uuid[],
  target_reviewer_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  affected integer;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if coalesce(array_length(target_attachment_ids, 1), 0) = 0 then return 0; end if;

  select attachment.organization_id into target_organization_id
  from public.wpi_attachments attachment where attachment.id = target_attachment_ids[1];
  if target_organization_id is null then raise exception 'ATTACHMENT_NOT_FOUND'; end if;
  if not private.wpi_has_permission(target_organization_id, 'price.review') then
    raise exception 'ATTACHMENT_ASSIGN_PERMISSION_DENIED';
  end if;
  if not exists (
    select 1 from public.wpi_organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = target_reviewer_id and member.is_active
  ) then raise exception 'ATTACHMENT_REVIEWER_NOT_ACTIVE'; end if;

  update public.wpi_attachments attachment
  set assigned_reviewer_id = target_reviewer_id,
      assigned_by = auth.uid(),
      assigned_at = now(),
      review_due_at = coalesce(attachment.review_due_at, now() + interval '2 days'),
      updated_at = now()
  where attachment.organization_id = target_organization_id
    and attachment.id = any(target_attachment_ids)
    and attachment.status = 'active'
    and attachment.review_state not in ('confirmed', 'rejected', 'voided');
  get diagnostics affected = row_count;
  return affected;
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
  latest_ai public.wpi_attachment_ai_runs%rowtype;
  review_id uuid;
  next_verification_status text;
  next_review_state text;
  open_issue_count integer;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if review_decision not in ('confirmed', 'need_info', 'rejected') then raise exception 'ATTACHMENT_REVIEW_DECISION_UNSUPPORTED'; end if;
  if char_length(btrim(coalesce(review_notes, ''))) < 5 then raise exception 'ATTACHMENT_REVIEW_NOTES_REQUIRED'; end if;

  select * into attachment_row
  from public.wpi_attachments attachment
  where attachment.id = target_attachment_id
  for update;

  if attachment_row.id is null then raise exception 'ATTACHMENT_NOT_FOUND'; end if;
  if not (
    private.wpi_has_permission(attachment_row.organization_id, 'price.review')
    or private.wpi_has_permission(attachment_row.organization_id, 'file.write')
  ) then raise exception 'ATTACHMENT_REVIEW_PERMISSION_DENIED'; end if;

  select * into latest_ai
  from public.wpi_attachment_ai_runs run
  where run.attachment_id = attachment_row.id
  order by run.created_at desc
  limit 1;
  select count(*) into open_issue_count
  from public.wpi_attachment_issues issue
  where issue.attachment_id = attachment_row.id and issue.status = 'open';

  if review_decision = 'confirmed' then
    if attachment_row.related_id is null or attachment_row.related_type is null then
      raise exception 'ATTACHMENT_RELATION_REQUIRED';
    end if;
    if latest_ai.id is null or latest_ai.status not in ('needs_review', 'completed') then
      raise exception 'ATTACHMENT_AI_REVIEW_REQUIRED';
    end if;
    if open_issue_count > 0 then raise exception 'ATTACHMENT_OPEN_ISSUES:%', open_issue_count; end if;
    if attachment_row.duplicate_of_attachment_id is not null then raise exception 'ATTACHMENT_DUPLICATE_UNRESOLVED'; end if;
    if latest_ai.risk_level in ('high', 'critical') and char_length(btrim(review_notes)) < 20 then
      raise exception 'ATTACHMENT_HIGH_RISK_JUSTIFICATION_REQUIRED';
    end if;
  end if;

  insert into public.wpi_attachment_reviews (
    organization_id, attachment_id, reviewer_id, decision, notes
  ) values (
    attachment_row.organization_id, attachment_row.id, auth.uid(), review_decision, btrim(review_notes)
  ) returning id into review_id;

  next_verification_status := case when review_decision = 'confirmed' then 'verified'
    when review_decision = 'rejected' then 'rejected' else 'pending' end;
  next_review_state := case when review_decision = 'confirmed' then 'confirmed'
    when review_decision = 'rejected' then 'rejected' else 'need_info' end;

  update public.wpi_attachments attachment
  set verification_status = next_verification_status,
      review_state = next_review_state,
      verified_by = case when review_decision = 'confirmed' then auth.uid() else null end,
      verified_at = case when review_decision = 'confirmed' then now() else null end,
      review_due_at = case when review_decision in ('confirmed', 'rejected') then null else now() + interval '2 days' end,
      metadata = coalesce(attachment.metadata, '{}'::jsonb) || jsonb_build_object(
        'last_review_decision', review_decision,
        'last_review_notes', btrim(review_notes),
        'last_reviewed_at', now()
      ),
      updated_at = now()
  where attachment.id = attachment_row.id;

  return jsonb_build_object('reviewId', review_id, 'attachmentId', attachment_row.id,
    'verificationStatus', next_verification_status, 'reviewState', next_review_state, 'reviewedAt', now());
end;
$$;

create or replace function private.wpi_refresh_attachment_governance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row record;
  issue_count integer;
  updated_count integer := 0;
  incident_id uuid;
begin
  update public.wpi_attachments attachment
  set governance_flags = array_remove(array[
        case when attachment.related_id is null then 'unlinked' end,
        case when attachment.review_state = 'pending_ai' then 'ai_pending' end,
        case when attachment.review_state not in ('confirmed', 'rejected', 'voided') and attachment.review_due_at < now() then 'overdue_review' end,
        case when attachment.valid_until is not null and attachment.valid_until < current_date then 'expired' end,
        case when attachment.duplicate_of_attachment_id is not null then 'duplicate_checksum' end,
        case when attachment.ai_status = 'failed' then 'ai_failed' end
      ]::text[], null),
      updated_at = case when attachment.governance_flags is distinct from array_remove(array[
        case when attachment.related_id is null then 'unlinked' end,
        case when attachment.review_state = 'pending_ai' then 'ai_pending' end,
        case when attachment.review_state not in ('confirmed', 'rejected', 'voided') and attachment.review_due_at < now() then 'overdue_review' end,
        case when attachment.valid_until is not null and attachment.valid_until < current_date then 'expired' end,
        case when attachment.duplicate_of_attachment_id is not null then 'duplicate_checksum' end,
        case when attachment.ai_status = 'failed' then 'ai_failed' end
      ]::text[], null) then now() else attachment.updated_at end
  where attachment.status = 'active';
  get diagnostics updated_count = row_count;

  for organization_row in select organization.id from public.wpi_organizations organization loop
    select count(*) into issue_count
    from public.wpi_attachments attachment
    where attachment.organization_id = organization_row.id
      and attachment.status = 'active'
      and attachment.governance_flags && array['overdue_review', 'duplicate_checksum', 'ai_failed']::text[];

    select incident.id into incident_id
    from public.wpi_automation_incidents incident
    where incident.organization_id = organization_row.id
      and incident.incident_key = 'attachment-governance'
      and incident.status = 'open'
    limit 1;

    if issue_count > 0 and incident_id is null then
      insert into public.wpi_automation_incidents (
        organization_id, incident_key, severity, title, message, metadata
      ) values (
        organization_row.id, 'attachment-governance', 'warning', '附件证据治理待处理',
        issue_count || ' 条附件存在超期、重复或 AI 失败问题',
        jsonb_build_object('count', issue_count, 'remediationHref', '/attachments?issue=governance')
      );
    elsif issue_count > 0 and incident_id is not null then
      update public.wpi_automation_incidents incident
      set message = issue_count || ' 条附件存在超期、重复或 AI 失败问题',
          last_detected_at = now(), occurrence_count = incident.occurrence_count + 1,
          metadata = incident.metadata || jsonb_build_object('count', issue_count)
      where incident.id = incident_id;
    elsif issue_count = 0 and incident_id is not null then
      update public.wpi_automation_incidents incident
      set status = 'resolved', title = '附件证据治理已恢复',
          message = '附件超期、重复与 AI 失败问题已处理。', resolved_at = now()
      where incident.id = incident_id;
    end if;
  end loop;

  return jsonb_build_object('updated', updated_count);
end;
$$;

revoke all on function public.wpi_set_attachment_relation(uuid, text, uuid) from public, anon;
revoke all on function public.wpi_assign_attachments(uuid[], uuid) from public, anon;
revoke all on function public.wpi_submit_attachment_review(uuid, text, text) from public, anon;
revoke all on function private.wpi_refresh_attachment_governance() from public, anon, authenticated;
grant execute on function public.wpi_set_attachment_relation(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.wpi_assign_attachments(uuid[], uuid) to authenticated, service_role;
grant execute on function public.wpi_submit_attachment_review(uuid, text, text) to authenticated, service_role;
grant execute on function private.wpi_refresh_attachment_governance() to service_role;

do $cron$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'wpi-attachment-governance' limit 1;
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule(
    'wpi-attachment-governance',
    '*/30 * * * *',
    'select private.wpi_refresh_attachment_governance();'
  );
end
$cron$;

select private.wpi_refresh_attachment_governance();

comment on column public.wpi_attachments.review_state is
  'Operational review state. AI analysis never sets confirmed; only an authorized human review can confirm.';
comment on column public.wpi_attachments.governance_flags is
  'Derived operational flags refreshed every 30 minutes for attachment review governance.';
