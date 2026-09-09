create or replace function private.wpi_guard_equipment_price_under_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  core_fields_changed boolean;
  context_fields_changed boolean;
  void_fields_changed boolean;
  active_review_exists boolean;
  finalized_review_exists boolean;
begin
  core_fields_changed := row(
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
    new.technical_parameters
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
    old.technical_parameters
  );
  context_fields_changed := new.metadata is distinct from old.metadata;
  void_fields_changed := row(new.deleted_at, new.deletion_reason)
    is distinct from row(old.deleted_at, old.deletion_reason);

  select
    coalesce(bool_or(review.status in ('pending', 'in_review')), false),
    coalesce(bool_or(review.status in ('approved', 'rejected', 'archived')), false)
  into active_review_exists, finalized_review_exists
  from public.wpi_equipment_price_reviews review
  where review.organization_id = old.organization_id
    and review.equipment_price_id = old.id;

  if active_review_exists
    and (core_fields_changed or context_fields_changed or void_fields_changed) then
    raise exception 'Equipment price is under review and cannot be modified';
  end if;
  if finalized_review_exists and core_fields_changed then
    raise exception 'Finalized equipment price must be changed through a revision';
  end if;

  return new;
end;
$$;

;
