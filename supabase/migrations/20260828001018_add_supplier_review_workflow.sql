create or replace function public.wpi_review_suppliers(
  p_supplier_ids uuid[],
  p_decision public.wpi_review_status,
  p_notes text
)
returns table(supplier_id uuid, review_status public.wpi_review_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_missing_legal_names integer;
begin
  if v_actor is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_decision not in ('pending_review', 'approved', 'rejected') then
    raise exception 'INVALID_SUPPLIER_REVIEW_DECISION';
  end if;
  if coalesce(array_length(p_supplier_ids, 1), 0) = 0 then
    raise exception 'SUPPLIER_IDS_REQUIRED';
  end if;
  if v_notes is null or char_length(v_notes) < 5 then
    raise exception 'SUPPLIER_REVIEW_NOTES_REQUIRED';
  end if;

  select membership.organization_id
    into v_organization_id
  from public.wpi_organization_members membership
  where membership.user_id = v_actor
    and membership.is_active = true
  order by membership.created_at
  limit 1;

  if v_organization_id is null
    or not private.wpi_has_permission(v_organization_id, 'supplier.review') then
    raise exception 'SUPPLIER_REVIEW_FORBIDDEN';
  end if;

  if (
    select count(*)
    from public.wpi_suppliers supplier
    where supplier.organization_id = v_organization_id
      and supplier.id = any(p_supplier_ids)
  ) <> (select count(distinct item) from unnest(p_supplier_ids) item) then
    raise exception 'SUPPLIER_NOT_FOUND_OR_CROSS_ORGANIZATION';
  end if;

  if p_decision = 'approved' then
    select count(*)
      into v_missing_legal_names
    from public.wpi_suppliers supplier
    where supplier.organization_id = v_organization_id
      and supplier.id = any(p_supplier_ids)
      and nullif(btrim(coalesce(supplier.legal_name, '')), '') is null;
    if v_missing_legal_names > 0 then
      raise exception 'SUPPLIER_LEGAL_ENTITY_REQUIRED';
    end if;
  end if;

  insert into public.wpi_supplier_reviews (
    organization_id, supplier_id, reviewer_id, status, completeness,
    confidence, risk_level, notes, conflicts, reviewed_at
  )
  select supplier.organization_id, supplier.id, v_actor, p_decision,
    case when jsonb_typeof(supplier.metadata -> 'dataCompleteness') = 'number'
      then (supplier.metadata ->> 'dataCompleteness')::numeric else null end,
    supplier.confidence, supplier.risk_level, v_notes,
    coalesce(supplier.metadata -> 'conflicts', '[]'::jsonb), now()
  from public.wpi_suppliers supplier
  where supplier.organization_id = v_organization_id
    and supplier.id = any(p_supplier_ids);

  return query
  update public.wpi_suppliers supplier
  set review_status = p_decision,
      metadata = supplier.metadata || jsonb_build_object(
        'humanReview', jsonb_build_object(
          'status', p_decision, 'reviewedBy', v_actor,
          'reviewedAt', now(), 'notes', v_notes
        ),
        'migration', coalesce(supplier.metadata -> 'migration', '{}'::jsonb)
          || jsonb_build_object('inquiryAdmission', p_decision = 'approved')
      ),
      updated_by = v_actor,
      updated_at = now()
  where supplier.organization_id = v_organization_id
    and supplier.id = any(p_supplier_ids)
  returning supplier.id, supplier.review_status;
end;
$$;

revoke all on function public.wpi_review_suppliers(uuid[], public.wpi_review_status, text) from public;
grant execute on function public.wpi_review_suppliers(uuid[], public.wpi_review_status, text) to authenticated;
comment on function public.wpi_review_suppliers(uuid[], public.wpi_review_status, text) is
  'Atomically records a permission-checked human supplier review and updates inquiry admission state.';;
