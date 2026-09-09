-- Local security repair. Public RPCs are invokers; privileged bodies live in private.
-- The invoker trigger trusts database owners, never a client-set session flag.
alter table public.wpi_attachments add column evidence_version bigint not null default 1;

create or replace function private.wpi_can_review_attachment(org uuid, actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from public.wpi_organization_members caller
      where caller.organization_id = org and caller.user_id = auth.uid() and caller.is_active)
    and exists (
      select 1 from public.wpi_organization_members member
      where member.organization_id = org and member.user_id = actor and member.is_active
        and member.role in ('admin', 'manager', 'reviewer')
        and (member.role = 'admin' or coalesce(
          (select override.is_enabled from public.wpi_organization_role_permissions override
           where override.organization_id = org and override.role = member.role and override.permission = 'price.review'),
          exists (select 1 from public.wpi_role_permissions permission
            where permission.role = member.role and permission.permission = 'price.review')))
    );
$$;
revoke all on function private.wpi_can_review_attachment(uuid, uuid) from public, anon;
grant execute on function private.wpi_can_review_attachment(uuid, uuid) to authenticated;

create or replace function public.wpi_attachment_reviewers(target_organization_id uuid)
returns table(user_id uuid, role public.wpi_app_role)
language sql stable security invoker set search_path = '' as $$
  select member.user_id, member.role from public.wpi_organization_members member
  where member.organization_id = target_organization_id
    and private.wpi_can_review_attachment(target_organization_id, member.user_id);
$$;
revoke all on function public.wpi_attachment_reviewers(uuid) from public, anon;
grant execute on function public.wpi_attachment_reviewers(uuid) to authenticated;

-- Reserved review/identity metadata cannot be injected, changed or deleted by
-- table clients (including business admins using the authenticated DB role).
create or replace function private.wpi_attachment_review_metadata(value jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(key, val), '{}'::jsonb)
  from jsonb_each(coalesce(value, '{}'::jsonb)) item(key, val)
  where lower(key) ~ 'review|verif|confirm|assign';
$$;
revoke all on function private.wpi_attachment_review_metadata(jsonb) from public, anon;
grant execute on function private.wpi_attachment_review_metadata(jsonb) to authenticated, service_role;

create or replace function private.wpi_guard_attachment_review_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  direct_client boolean := current_user in ('authenticated', 'anon');
  old_review jsonb := '{}'::jsonb;
  new_review jsonb;
  content_changed boolean := false;
  reset_requested boolean := false;
begin
  if jsonb_typeof(new.metadata) is distinct from 'object' then
    raise exception 'ATTACHMENT_METADATA_OBJECT_REQUIRED';
  end if;
  new_review := private.wpi_attachment_review_metadata(new.metadata);
  if tg_op = 'UPDATE' then
    old_review := private.wpi_attachment_review_metadata(old.metadata);
    if row(new.id, new.organization_id, new.uploaded_by, new.created_at, new.attachment_code)
      is distinct from row(old.id, old.organization_id, old.uploaded_by, old.created_at, old.attachment_code) then
      raise exception 'ATTACHMENT_IDENTITY_IMMUTABLE';
    end if;
    content_changed := row(new.bucket_id, new.object_path, new.checksum, new.original_name,
      new.content_type, new.size_bytes, new.related_type, new.related_id, new.evidence_type,
      new.document_date, new.valid_until, new.description,
      new.metadata - array(select jsonb_object_keys(new_review)))
      is distinct from row(old.bucket_id, old.object_path, old.checksum, old.original_name,
      old.content_type, old.size_bytes, old.related_type, old.related_id, old.evidence_type,
      old.document_date, old.valid_until, old.description,
      old.metadata - array(select jsonb_object_keys(old_review)));
    reset_requested := new.verification_status = 'pending' and new.verified_by is null
      and new.verified_at is null and (new.review_state in ('pending_ai', 'pending_review')
        or (content_changed and new.review_state = old.review_state))
      and (content_changed or row(new.ai_status, new.ai_analyzed_at) is distinct from row(old.ai_status, old.ai_analyzed_at));
  end if;

  if direct_client then
    if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
    if new_review is distinct from old_review then raise exception 'ATTACHMENT_REVIEW_FIELDS_PROTECTED'; end if;
    if tg_op = 'INSERT' then
      if new.uploaded_by is distinct from auth.uid() or new.verification_status <> 'pending'
        or new.review_state <> 'pending_ai' or new.verified_by is not null or new.verified_at is not null
        or new.assigned_reviewer_id is not null or new.assigned_by is not null or new.assigned_at is not null
        or new.evidence_version <> 1 or new.status <> 'active' or new.duplicate_of_attachment_id is not null then
        raise exception 'ATTACHMENT_REVIEW_FIELDS_PROTECTED';
      end if;
    else
      if new.evidence_version is distinct from old.evidence_version
        or new.duplicate_of_attachment_id is distinct from old.duplicate_of_attachment_id
        or row(new.assigned_reviewer_id, new.assigned_by, new.assigned_at)
          is distinct from row(old.assigned_reviewer_id, old.assigned_by, old.assigned_at)
        or (not reset_requested and row(new.verification_status, new.verified_by, new.verified_at, new.review_state)
          is distinct from row(old.verification_status, old.verified_by, old.verified_at, old.review_state)) then
        raise exception 'ATTACHMENT_REVIEW_FIELDS_PROTECTED';
      end if;
    end if;
  end if;

  if content_changed then
    new.evidence_version := old.evidence_version + 1;
    new.ai_status := 'not_run';
    new.ai_confidence := null;
    new.ai_risk_level := null;
    new.ai_analyzed_at := null;
  end if;
  if content_changed or reset_requested then
    new.review_state := case when content_changed then 'pending_ai' else new.review_state end;
    new.verification_status := 'pending';
    new.verified_by := null;
    new.verified_at := null;
    new.metadata := new.metadata - array(select jsonb_object_keys(new_review));
    new.review_due_at := now() + interval '2 days';
  end if;
  if new.status = 'archived' then
    new.review_state := 'voided';
    new.verification_status := 'pending';
    new.verified_by := null;
    new.verified_at := null;
    new.metadata := new.metadata - array(select jsonb_object_keys(new_review));
    new.review_due_at := null;
  end if;
  return new;
end;
$$;
revoke all on function private.wpi_guard_attachment_review_fields() from public, anon, authenticated;
create trigger wpi_attachments_00_guard_review_fields before insert or update on public.wpi_attachments
for each row execute function private.wpi_guard_attachment_review_fields();

-- Keep review history append-only and writable exclusively from privileged RPCs.
revoke insert, update, delete on public.wpi_attachment_reviews from public, anon, authenticated;

create or replace function private.wpi_submit_attachment_review_impl(
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
  if review_decision is null or review_decision not in ('confirmed', 'need_info', 'rejected') then raise exception 'ATTACHMENT_REVIEW_DECISION_UNSUPPORTED'; end if;
  if char_length(btrim(coalesce(review_notes, ''))) < 5 then raise exception 'ATTACHMENT_REVIEW_NOTES_REQUIRED'; end if;

  select * into attachment_row
  from public.wpi_attachments attachment
  where attachment.id = target_attachment_id
  for update;

  if attachment_row.id is null then raise exception 'ATTACHMENT_NOT_FOUND'; end if;
  if not private.wpi_can_review_attachment(attachment_row.organization_id, auth.uid()) then raise exception 'ATTACHMENT_REVIEW_PERMISSION_DENIED'; end if;

  if attachment_row.status <> 'active' or attachment_row.review_state in ('confirmed','rejected','voided') then
    raise exception 'ATTACHMENT_REVIEW_STATE_CONFLICT';
  end if;
  if char_length(btrim(review_notes)) > 1000 then raise exception 'ATTACHMENT_REVIEW_NOTES_REQUIRED'; end if;

  select * into latest_ai
  from public.wpi_attachment_ai_runs run
  where run.attachment_id = attachment_row.id and run.organization_id = attachment_row.organization_id
  order by run.created_at desc
  limit 1;
  select count(*) into open_issue_count
  from public.wpi_attachment_issues issue
  where issue.attachment_id = attachment_row.id and issue.status = 'open';

  if review_decision = 'confirmed' then
    if attachment_row.related_id is null or attachment_row.related_type is null then
      raise exception 'ATTACHMENT_RELATION_REQUIRED';
    end if;
    if latest_ai.id is null or latest_ai.status not in ('needs_review', 'completed')
      or latest_ai.input_snapshot ->> 'evidenceVersion' is distinct from attachment_row.evidence_version::text then
      raise exception 'ATTACHMENT_AI_REVIEW_REQUIRED';
    end if;
    if nullif(btrim(attachment_row.checksum), '') is null or attachment_row.metadata ->> 'migrated_from' = 'legacy-mock' then
      raise exception 'ATTACHMENT_SOURCE_EVIDENCE_REQUIRED';
    end if;
    -- Validate the referenced business row in the same organization under lock.
    case attachment_row.related_type
      when 'equipment_price' then perform 1 from public.wpi_equipment_prices where id = attachment_row.related_id and organization_id = attachment_row.organization_id for share;
      when 'material_price' then perform 1 from public.wpi_material_prices where id = attachment_row.related_id and organization_id = attachment_row.organization_id for share;
      when 'inquiry' then perform 1 from public.wpi_inquiries where id = attachment_row.related_id and organization_id = attachment_row.organization_id for share;
      when 'project' then perform 1 from public.wpi_projects where id = attachment_row.related_id and organization_id = attachment_row.organization_id for share;
      when 'report' then perform 1 from public.wpi_reports where id = attachment_row.related_id and organization_id = attachment_row.organization_id for share;
      else raise exception 'ATTACHMENT_RELATION_TYPE_UNSUPPORTED';
    end case;
    if not found then raise exception 'ATTACHMENT_RELATION_TARGET_NOT_FOUND'; end if;
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

create or replace function private.wpi_assign_attachments_impl(
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
  if coalesce(cardinality(target_attachment_ids), 0) = 0 or cardinality(target_attachment_ids) > 50
    or array_position(target_attachment_ids, null) is not null or array_ndims(target_attachment_ids) <> 1 then
    raise exception 'ATTACHMENT_ASSIGN_IDS_INVALID';
  end if;

  select attachment.organization_id into target_organization_id
  from public.wpi_attachments attachment where attachment.id = target_attachment_ids[1];
  if target_organization_id is null then raise exception 'ATTACHMENT_NOT_FOUND'; end if;
  if not private.wpi_can_review_attachment(target_organization_id, auth.uid()) then
    raise exception 'ATTACHMENT_ASSIGN_PERMISSION_DENIED';
  end if;
  if not private.wpi_can_review_attachment(target_organization_id, target_reviewer_id) then
    raise exception 'ATTACHMENT_REVIEWER_NOT_ELIGIBLE';
  end if;
  -- Lock all rows in stable order; reject missing, foreign and terminal rows atomically.
  perform 1 from public.wpi_attachments where id = any(target_attachment_ids) order by id for update;
  if (select count(*) from public.wpi_attachments where id = any(target_attachment_ids)
      and organization_id = target_organization_id and status = 'active'
      and review_state not in ('confirmed','rejected','voided'))
    <> (select count(distinct item) from unnest(target_attachment_ids) item) then
    raise exception 'ATTACHMENT_ASSIGN_SCOPE_OR_STATE_CONFLICT';
  end if;

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

revoke all on function private.wpi_submit_attachment_review_impl(uuid, text, text) from public, anon;
revoke all on function private.wpi_assign_attachments_impl(uuid[], uuid) from public, anon;
grant execute on function private.wpi_submit_attachment_review_impl(uuid, text, text) to authenticated;
grant execute on function private.wpi_assign_attachments_impl(uuid[], uuid) to authenticated;

create or replace function public.wpi_submit_attachment_review(
  target_attachment_id uuid, review_decision text, review_notes text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.wpi_submit_attachment_review_impl(target_attachment_id, review_decision, review_notes);
$$;
create or replace function public.wpi_assign_attachments(target_attachment_ids uuid[], target_reviewer_id uuid)
returns integer language sql security invoker set search_path = '' as $$
  select private.wpi_assign_attachments_impl(target_attachment_ids, target_reviewer_id);
$$;
revoke all on function public.wpi_submit_attachment_review(uuid, text, text) from public, anon;
revoke all on function public.wpi_assign_attachments(uuid[], uuid) from public, anon;
grant execute on function public.wpi_submit_attachment_review(uuid, text, text) to authenticated;
grant execute on function public.wpi_assign_attachments(uuid[], uuid) to authenticated;

-- Check both sides of a reassociation. Checking only NEW.related_type allowed
-- a frozen equipment attachment to escape its original business review.
create or replace function private.wpi_guard_equipment_evidence_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target record;
begin
  for target in
    select distinct candidate.org, candidate.related_type, candidate.related_id
    from (values
      (case when tg_op <> 'INSERT' then old.organization_id end,
       case when tg_op <> 'INSERT' then old.related_type end,
       case when tg_op <> 'INSERT' then old.related_id end),
      (case when tg_op <> 'DELETE' then new.organization_id end,
       case when tg_op <> 'DELETE' then new.related_type end,
       case when tg_op <> 'DELETE' then new.related_id end)
    ) candidate(org, related_type, related_id)
    where candidate.related_type = 'equipment_price' and candidate.related_id is not null
  loop
    if exists (select 1 from public.wpi_equipment_price_reviews review
      where review.organization_id = target.org and review.equipment_price_id = target.related_id
        and review.status in ('pending','in_review')) then
      raise exception 'Equipment price evidence is frozen while review is active';
    end if;
    if exists (select 1 from public.wpi_equipment_price_reviews review
      where review.organization_id = target.org and review.equipment_price_id = target.related_id
        and review.status in ('approved','rejected','archived')) then
      raise exception 'Finalized equipment price evidence must be changed through a revision';
    end if;
  end loop;
  return coalesce(new, old);
end;
$$;
revoke all on function private.wpi_guard_equipment_evidence_mutation() from public, anon, authenticated;
