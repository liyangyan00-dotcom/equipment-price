create or replace function private.wpi_guard_equipment_price_under_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.wpi_equipment_price_reviews review
    where review.organization_id = old.organization_id
      and review.equipment_price_id = old.id
      and review.status in ('pending', 'in_review')
  ) and row(
    new.equipment_name,
    new.brand,
    new.model,
    new.category,
    new.original_price,
    new.original_currency,
    new.usd_price,
    new.price_term,
    new.supplier_id,
    new.source_type,
    new.source_url,
    new.valid_until,
    new.confidence,
    new.risk_level,
    new.technical_parameters,
    new.metadata,
    new.deleted_at,
    new.deletion_reason
  ) is distinct from row(
    old.equipment_name,
    old.brand,
    old.model,
    old.category,
    old.original_price,
    old.original_currency,
    old.usd_price,
    old.price_term,
    old.supplier_id,
    old.source_type,
    old.source_url,
    old.valid_until,
    old.confidence,
    old.risk_level,
    old.technical_parameters,
    old.metadata,
    old.deleted_at,
    old.deletion_reason
  ) then
    raise exception 'Equipment price is under review and cannot be modified';
  end if;

  return new;
end;
$$;

drop trigger if exists wpi_equipment_prices_guard_under_review
on public.wpi_equipment_prices;
create trigger wpi_equipment_prices_guard_under_review
before update on public.wpi_equipment_prices
for each row execute function private.wpi_guard_equipment_price_under_review();

create or replace function public.wpi_queue_equipment_price_review(
  target_price_id uuid,
  review_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  price_row public.wpi_equipment_prices;
  review_row public.wpi_equipment_price_reviews;
  payload_matched_rules text[];
  payload_missing_fields text[];
  payload_evidence_checks jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into price_row
  from public.wpi_equipment_prices
  where id = target_price_id
    and deleted_at is null
  for update;

  if price_row.id is null then
    raise exception 'Equipment price not found';
  end if;
  if not private.wpi_has_permission(price_row.organization_id, 'price.write') then
    raise exception 'Insufficient price write permission';
  end if;

  select * into review_row
  from public.wpi_equipment_price_reviews
  where organization_id = price_row.organization_id
    and equipment_price_id = price_row.id
  for update;

  if review_row.id is not null
    and review_row.status in ('pending', 'in_review') then
    raise exception 'Equipment price is already under review';
  end if;
  if review_row.id is not null
    and review_row.status in ('approved', 'rejected', 'archived') then
    raise exception 'Finalized equipment price review must be preserved as a revision';
  end if;

  select coalesce(array_agg(value), '{}'::text[])
  into payload_matched_rules
  from jsonb_array_elements_text(
    coalesce(review_payload -> 'matchedRules', '[]'::jsonb)
  ) value;

  select coalesce(array_agg(value), '{}'::text[])
  into payload_missing_fields
  from jsonb_array_elements_text(
    coalesce(review_payload -> 'missingFields', '[]'::jsonb)
  ) value;

  payload_evidence_checks := coalesce(review_payload -> 'evidenceChecks', '{}'::jsonb);

  if review_row.id is null then
    insert into public.wpi_equipment_price_reviews (
      organization_id,
      equipment_price_id,
      source_kind,
      status,
      confidence,
      completeness,
      risk_level,
      payload_matched_rules,
      payload_missing_fields,
      payload_evidence_checks,
      ai_judgment,
      ai_recommendation,
      assigned_to,
      submitted_by,
      reviewed_by,
      review_comment,
      submitted_at,
      reviewed_at
    ) values (
      price_row.organization_id,
      price_row.id,
      'price',
      'pending',
      coalesce((review_payload ->> 'confidence')::numeric, price_row.confidence, 0),
      coalesce((review_payload ->> 'completeness')::numeric, 0),
      coalesce(
        nullif(review_payload ->> 'riskLevel', '')::public.wpi_risk_level,
        price_row.risk_level
      ),
      matched_rules,
      missing_fields,
      evidence_checks,
      nullif(review_payload ->> 'aiJudgment', ''),
      nullif(review_payload ->> 'aiRecommendation', ''),
      null,
      auth.uid(),
      null,
      null,
      now(),
      null
    )
    returning * into review_row;
  else
    update public.wpi_equipment_price_reviews
    set
      status = 'pending',
      confidence = coalesce((review_payload ->> 'confidence')::numeric, confidence),
      completeness = coalesce((review_payload ->> 'completeness')::numeric, completeness),
      risk_level = coalesce(
        nullif(review_payload ->> 'riskLevel', '')::public.wpi_risk_level,
        risk_level
      ),
      matched_rules = payload_matched_rules,
      missing_fields = payload_missing_fields,
      evidence_checks = payload_evidence_checks,
      ai_judgment = nullif(review_payload ->> 'aiJudgment', ''),
      ai_recommendation = nullif(review_payload ->> 'aiRecommendation', ''),
      assigned_to = null,
      submitted_by = auth.uid(),
      reviewed_by = null,
      review_comment = null,
      submitted_at = now(),
      reviewed_at = null
    where id = review_row.id
    returning * into review_row;
  end if;

  update public.wpi_equipment_prices
  set
    review_status = 'pending_review',
    updated_by = auth.uid()
  where id = price_row.id;

  return jsonb_build_object(
    'ok', true,
    'review', to_jsonb(review_row),
    'priceId', price_row.id,
    'reviewStatus', 'pending_review',
    'queuedAt', now()
  );
end;
$$;

revoke all on function public.wpi_queue_equipment_price_review(uuid, jsonb)
from public, anon;
grant execute on function public.wpi_queue_equipment_price_review(uuid, jsonb)
to authenticated;

;
