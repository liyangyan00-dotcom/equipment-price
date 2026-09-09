create or replace function public.wpi_submit_equipment_price_review(
  review_id uuid,
  decision text default null,
  comment text default null,
  evidence_states jsonb default null,
  resolved_issue_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_row public.wpi_equipment_price_reviews;
  reviewed_row public.wpi_equipment_price_reviews;
  persisted_evidence_checks jsonb;
  remaining_rules text[];
  remaining_fields text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into review_row
  from public.wpi_equipment_price_reviews
  where id = review_id
  for update;

  if review_row.id is null then
    raise exception 'Review task not found';
  end if;
  if not private.wpi_has_permission(review_row.organization_id, 'price.review') then
    raise exception 'Insufficient review permission';
  end if;
  if review_row.status in ('approved', 'rejected', 'archived') then
    raise exception 'Review task is already finalized';
  end if;
  if decision is null and evidence_states is null then
    raise exception 'No review content to save';
  end if;
  if decision is not null
    and decision not in ('start', 'approve', 'reject', 'need_info') then
    raise exception 'Unsupported review decision: %', decision;
  end if;

  if evidence_states is not null then
    if review_row.status <> 'in_review'
      or review_row.assigned_to is distinct from auth.uid() then
      raise exception 'Claim the review task before saving progress';
    end if;
    if not (
      evidence_states ? 'price_source'
      and evidence_states ? 'supplier'
      and evidence_states ? 'technical_parameters'
      and evidence_states ? 'validity'
    ) then
      raise exception 'All evidence states are required';
    end if;
    if exists (
      select 1
      from jsonb_each_text(evidence_states) entry
      where entry.key in ('price_source', 'supplier', 'technical_parameters', 'validity')
        and entry.value not in ('verified', 'problem', 'missing')
    ) then
      raise exception 'Invalid evidence state';
    end if;

    persisted_evidence_checks := jsonb_build_object(
      'price_source', evidence_states ->> 'price_source' = 'verified',
      'supplier', evidence_states ->> 'supplier' = 'verified',
      'technical_parameters', evidence_states ->> 'technical_parameters' = 'verified',
      'validity', evidence_states ->> 'validity' = 'verified',
      '_states', evidence_states,
      '_updated_at', now()
    );

    remaining_rules := array(
      select label
      from unnest(coalesce(review_row.matched_rules, '{}'::text[])) label
      where not (('rule:' || label) = any(coalesce(resolved_issue_ids, '{}'::text[])))
    );
    remaining_fields := array(
      select label
      from unnest(coalesce(review_row.missing_fields, '{}'::text[])) label
      where not (('missing:' || label) = any(coalesce(resolved_issue_ids, '{}'::text[])))
    );

    update public.wpi_equipment_price_reviews
    set
      evidence_checks = persisted_evidence_checks,
      matched_rules = remaining_rules,
      missing_fields = remaining_fields,
      review_comment = nullif(btrim(comment), '')
    where id = review_id
    returning * into review_row;
  end if;

  if decision is null then
    return jsonb_build_object(
      'ok', true,
      'review', to_jsonb(review_row),
      'savedAt', now()
    );
  end if;

  select * into reviewed_row
  from public.wpi_review_equipment_price(
    review_id,
    decision,
    nullif(btrim(comment), '')
  );

  return jsonb_build_object(
    'ok', true,
    'review', to_jsonb(reviewed_row),
    'processedAt', now()
  );
end;
$$;

revoke all on function public.wpi_submit_equipment_price_review(
  uuid,
  text,
  text,
  jsonb,
  text[]
) from public, anon;
grant execute on function public.wpi_submit_equipment_price_review(
  uuid,
  text,
  text,
  jsonb,
  text[]
) to authenticated;

;
