create or replace function private.wpi_guard_finalized_equipment_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status in ('approved', 'rejected', 'archived') then
    raise exception 'Review task is already finalized';
  end if;

  if new.status = 'in_review' then
    if old.status not in ('pending', 'need_info', 'in_review') then
      raise exception 'Review task cannot enter in-review state from %', old.status;
    end if;
    if new.assigned_to is distinct from auth.uid() then
      raise exception 'Review task must be claimed by the current reviewer';
    end if;
    if old.assigned_to is not null and old.assigned_to is distinct from auth.uid() then
      raise exception 'Review task has been claimed by another reviewer';
    end if;
  end if;

  if new.status in ('approved', 'rejected', 'need_info')
    and new.status is distinct from old.status then
    if old.status <> 'in_review' then
      raise exception 'Claim the review task before submitting a decision';
    end if;
    if old.assigned_to is distinct from auth.uid() then
      raise exception 'Only the assigned reviewer can submit the decision';
    end if;
    if nullif(btrim(new.review_comment), '') is null then
      raise exception 'A manual review comment is required';
    end if;
  end if;

  if new.status = 'approved' and new.status is distinct from old.status then
    if not (
      coalesce((new.evidence_checks ->> 'price_source')::boolean, false)
      and coalesce((new.evidence_checks ->> 'supplier')::boolean, false)
      and coalesce((new.evidence_checks ->> 'technical_parameters')::boolean, false)
      and coalesce((new.evidence_checks ->> 'validity')::boolean, false)
    ) then
      raise exception 'Complete all evidence checks before approval';
    end if;
    if coalesce(cardinality(new.matched_rules), 0) > 0
      or coalesce(cardinality(new.missing_fields), 0) > 0 then
      raise exception 'Resolve all review issues before approval';
    end if;
  end if;

  return new;
end;
$$;

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

  foreach target_review_id in array review_ids loop
    select * into review_row
    from public.wpi_equipment_price_reviews
    where id = target_review_id
    for update;

    if review_row.id is null then
      raise exception 'Review task not found: %', target_review_id;
    end if;
    if not private.wpi_has_permission(review_row.organization_id, 'price.review') then
      raise exception 'Insufficient review permission';
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
to authenticated;;
