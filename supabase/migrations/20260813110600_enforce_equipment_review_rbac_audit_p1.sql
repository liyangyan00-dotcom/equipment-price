create or replace function private.wpi_has_any_role(
  target_organization_id uuid,
  allowed_roles public.wpi_app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.wpi_organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.is_active
      and member.role = any(allowed_roles)
  );
$$;

revoke all on function private.wpi_has_any_role(uuid, public.wpi_app_role[])
from public, anon;
grant execute on function private.wpi_has_any_role(uuid, public.wpi_app_role[])
to authenticated;

-- Review rows may only be mutated through the guarded workflow RPCs. This
-- prevents authenticated clients from bypassing assignment and transition rules.
revoke insert, update, delete on public.wpi_equipment_price_reviews
from authenticated;

create index if not exists wpi_audit_table_record_created_idx
  on public.wpi_audit_logs (table_name, record_id, created_at desc);

create or replace function public.wpi_record_equipment_access_event(
  target_price_id uuid,
  event_action text,
  event_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  price_row public.wpi_equipment_prices;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into price_row
  from public.wpi_equipment_prices
  where id = target_price_id
    and deleted_at is null;

  if price_row.id is null then
    raise exception 'Equipment price not found';
  end if;
  if not private.wpi_has_permission(price_row.organization_id, 'price.read') then
    raise exception 'Insufficient price read permission';
  end if;
  if event_action not in (
    'review.view',
    'audit.view',
    'evidence.preview',
    'evidence.download'
  ) then
    raise exception 'Unsupported equipment access event';
  end if;

  insert into public.wpi_audit_logs (
    organization_id,
    actor_id,
    action,
    table_name,
    record_id,
    new_data,
    request_id
  ) values (
    price_row.organization_id,
    auth.uid(),
    event_action,
    'wpi_equipment_price_access',
    price_row.id::text,
    jsonb_build_object(
      'priceCode', price_row.price_code,
      'equipmentName', price_row.equipment_name,
      'context', coalesce(event_data, '{}'::jsonb)
    ),
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id'
  );
end;
$$;

revoke all on function public.wpi_record_equipment_access_event(uuid, text, jsonb)
from public, anon;
grant execute on function public.wpi_record_equipment_access_event(uuid, text, jsonb)
to authenticated;

create or replace function public.wpi_get_equipment_review_audit(
  target_review_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  review_row public.wpi_equipment_price_reviews;
  event_rows jsonb;
  can_read_full_audit boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into review_row
  from public.wpi_equipment_price_reviews
  where id = target_review_id;

  if review_row.id is null then
    raise exception 'Review task not found';
  end if;
  if not private.wpi_has_permission(review_row.organization_id, 'price.read') then
    raise exception 'Insufficient price read permission';
  end if;

  can_read_full_audit := private.wpi_has_permission(
    review_row.organization_id,
    'audit.read'
  );

  with relevant_logs as (
    select audit.*
    from public.wpi_audit_logs audit
    where audit.organization_id = review_row.organization_id
      and (
        (audit.table_name = 'wpi_equipment_price_reviews'
          and audit.record_id = review_row.id::text)
        or (review_row.equipment_price_id is not null
          and audit.table_name = 'wpi_equipment_prices'
          and audit.record_id = review_row.equipment_price_id::text)
        or (review_row.equipment_price_id is not null
          and audit.table_name = 'wpi_equipment_price_access'
          and audit.record_id = review_row.equipment_price_id::text)
        or (review_row.equipment_price_id is not null
          and audit.table_name = 'wpi_attachments'
          and coalesce(audit.new_data, audit.old_data) ->> 'related_id'
            = review_row.equipment_price_id::text)
      )
    order by audit.created_at desc
    limit 80
  ), normalized_logs as (
    select
      audit.id,
      audit.created_at,
      audit.actor_id,
      audit.action,
      audit.table_name,
      audit.record_id,
      audit.old_data,
      audit.new_data,
      case
        when audit.action = 'review.view' then 'review_viewed'
        when audit.action = 'audit.view' then 'audit_viewed'
        when audit.action = 'evidence.preview' then 'evidence_previewed'
        when audit.action = 'evidence.download' then 'evidence_downloaded'
        when audit.table_name = 'wpi_equipment_price_reviews'
          and audit.action = 'insert' then 'review_submitted'
        when audit.table_name = 'wpi_equipment_price_reviews'
          and audit.old_data ->> 'status' in ('pending', 'need_info')
          and audit.new_data ->> 'status' = 'in_review' then 'review_started'
        when audit.table_name = 'wpi_equipment_price_reviews'
          and audit.new_data ->> 'status' = 'approved'
          and audit.old_data ->> 'status' is distinct from 'approved' then 'review_approved'
        when audit.table_name = 'wpi_equipment_price_reviews'
          and audit.new_data ->> 'status' = 'rejected'
          and audit.old_data ->> 'status' is distinct from 'rejected' then 'review_rejected'
        when audit.table_name = 'wpi_equipment_price_reviews'
          and audit.new_data ->> 'status' = 'need_info'
          and audit.old_data ->> 'status' is distinct from 'need_info' then 'review_returned'
        when audit.table_name = 'wpi_equipment_price_reviews'
          and audit.action = 'update' then 'review_progress_saved'
        when audit.table_name = 'wpi_attachments'
          and audit.action = 'insert' then 'evidence_uploaded'
        when audit.table_name = 'wpi_attachments'
          and audit.new_data ->> 'status' = 'archived'
          and audit.old_data ->> 'status' is distinct from 'archived' then 'evidence_archived'
        when audit.table_name = 'wpi_attachments'
          and audit.action = 'update' then 'evidence_updated'
        when audit.table_name = 'wpi_equipment_prices'
          and audit.action = 'update' then 'price_record_updated'
        else audit.table_name || '.' || audit.action
      end as event_type
    from relevant_logs audit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', log.id,
        'eventType', log.event_type,
        'action', log.action,
        'tableName', log.table_name,
        'recordId', log.record_id,
        'actorId', log.actor_id,
        'actorName', coalesce(profile.display_name, left(log.actor_id::text, 8), 'System'),
        'actorRole', member.role,
        'createdAt', log.created_at,
        'oldStatus', log.old_data ->> 'status',
        'newStatus', log.new_data ->> 'status',
        'comment', coalesce(
          log.new_data ->> 'review_comment',
          log.new_data #>> '{context,reason}'
        ),
        'context', case
          when can_read_full_audit then coalesce(log.new_data -> 'context', '{}'::jsonb)
          else '{}'::jsonb
        end
      )
      order by log.created_at desc
    ),
    '[]'::jsonb
  ) into event_rows
  from normalized_logs log
  left join public.wpi_profiles profile on profile.id = log.actor_id
  left join public.wpi_organization_members member
    on member.organization_id = review_row.organization_id
    and member.user_id = log.actor_id;

  return jsonb_build_object(
    'events', event_rows,
    'scope', 'equipment_review_task',
    'canReadFullAudit', can_read_full_audit
  );
end;
$$;

revoke all on function public.wpi_get_equipment_review_audit(uuid)
from public, anon;
grant execute on function public.wpi_get_equipment_review_audit(uuid)
to authenticated;

create or replace function public.wpi_batch_review_equipment_prices(
  review_ids uuid[],
  action text,
  comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_review_id uuid;
  review_row public.wpi_equipment_price_reviews;
  processed_ids uuid[] := '{}';
  target_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(cardinality(review_ids), 0) = 0 then
    raise exception 'Select at least one review task';
  end if;
  if cardinality(review_ids) > 100 then
    raise exception 'A maximum of 100 review tasks can be processed at once';
  end if;
  if action not in ('start', 'approve', 'need_info') then
    raise exception 'Unsupported batch review action: %', action;
  end if;
  if action in ('approve', 'need_info')
    and nullif(btrim(comment), '') is null then
    raise exception 'A manual review comment is required';
  end if;

  select organization_id into target_organization_id
  from public.wpi_equipment_price_reviews
  where id = review_ids[1];

  if target_organization_id is null then
    raise exception 'Review task not found';
  end if;
  if not private.wpi_has_any_role(
    target_organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  ) then
    raise exception 'Batch review requires manager or admin role';
  end if;

  foreach target_review_id in array review_ids loop
    select * into review_row
    from public.wpi_equipment_price_reviews
    where id = target_review_id
      and organization_id = target_organization_id
    for update;

    if review_row.id is null then
      raise exception 'Review task not found or belongs to another organization: %', target_review_id;
    end if;

    if action = 'start' then
      if review_row.status not in ('pending', 'need_info') then
        raise exception 'Only pending or returned tasks can be claimed: %', target_review_id;
      end if;
      if review_row.assigned_to is not null
        and review_row.assigned_to is distinct from auth.uid() then
        raise exception 'Review task has been claimed by another reviewer: %', target_review_id;
      end if;
    elsif action = 'approve' then
      if review_row.status <> 'in_review'
        or review_row.assigned_to is distinct from auth.uid() then
        raise exception 'Only claimed tasks can be batch approved: %', target_review_id;
      end if;
      if review_row.risk_level <> 'low' or coalesce(review_row.confidence, 0) < 80 then
        raise exception 'Batch approval only supports low-risk high-confidence tasks: %', target_review_id;
      end if;
      if not (
        coalesce((review_row.evidence_checks ->> 'price_source')::boolean, false)
        and coalesce((review_row.evidence_checks ->> 'supplier')::boolean, false)
        and coalesce((review_row.evidence_checks ->> 'technical_parameters')::boolean, false)
        and coalesce((review_row.evidence_checks ->> 'validity')::boolean, false)
      ) or coalesce(cardinality(review_row.matched_rules), 0) > 0
        or coalesce(cardinality(review_row.missing_fields), 0) > 0 then
        raise exception 'Evidence or review issues are incomplete: %', target_review_id;
      end if;
    else
      if review_row.status <> 'in_review'
        or review_row.assigned_to is distinct from auth.uid() then
        raise exception 'Only claimed tasks can be returned for more information: %', target_review_id;
      end if;
    end if;

    perform public.wpi_review_equipment_price(
      target_review_id,
      action,
      nullif(btrim(comment), '')
    );
    processed_ids := array_append(processed_ids, target_review_id);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'action', action,
    'processedCount', cardinality(processed_ids),
    'processedIds', to_jsonb(processed_ids),
    'reviewedBy', auth.uid(),
    'processedAt', now()
  );
end;
$$;

revoke all on function public.wpi_batch_review_equipment_prices(uuid[], text, text)
from public, anon;
grant execute on function public.wpi_batch_review_equipment_prices(uuid[], text, text)
to authenticated;

comment on function public.wpi_get_equipment_review_audit(uuid) is
  'Returns a sanitized, task-scoped audit trail to price readers. Full event context is limited to audit readers.';
comment on function public.wpi_record_equipment_access_event(uuid, text, jsonb) is
  'Records explicit equipment review and evidence access events after validating organization-scoped read permission.';

;
