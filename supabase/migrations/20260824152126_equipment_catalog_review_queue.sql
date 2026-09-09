alter table public.wpi_equipment_catalog
  add column if not exists assigned_reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists duplicate_of_catalog_id uuid references public.wpi_equipment_catalog(id) on delete set null,
  add column if not exists duplicate_score numeric(5,2)
    check (duplicate_score is null or duplicate_score between 0 and 100)
create index if not exists wpi_equipment_catalog_review_queue_idx
  on public.wpi_equipment_catalog(organization_id, review_status, review_due_at, updated_at desc)
create index if not exists wpi_equipment_catalog_assignee_idx
  on public.wpi_equipment_catalog(organization_id, assigned_reviewer_id, review_status)
  where assigned_reviewer_id is not null
create index if not exists wpi_equipment_catalog_duplicate_idx
  on public.wpi_equipment_catalog(organization_id, duplicate_of_catalog_id, duplicate_score desc)
  where duplicate_of_catalog_id is not null
comment on column public.wpi_equipment_catalog.assigned_reviewer_id is
  'Reviewer responsible for the current equipment catalog review.'
comment on column public.wpi_equipment_catalog.review_due_at is
  'Business deadline for completing the current review.'
comment on column public.wpi_equipment_catalog.duplicate_of_catalog_id is
  'Canonical catalog record selected when this record is merged as a duplicate.'
create or replace function private.wpi_merge_equipment_catalog_duplicates_impl(
  p_target_id uuid,
  p_source_ids uuid[],
  p_notes text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_organization_id uuid;
  v_source_ids uuid[];
  v_merged_count integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select organization_id into v_organization_id
  from public.wpi_equipment_catalog
  where id = p_target_id;

  if v_organization_id is null then
    raise exception 'Target equipment catalog record not found';
  end if;
  if not private.wpi_has_permission(v_organization_id, 'price.review') then
    raise exception 'Permission denied';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_source_ids
  from public.wpi_equipment_catalog
  where organization_id = v_organization_id
    and id = any(coalesce(p_source_ids, '{}'::uuid[]))
    and id <> p_target_id
    and review_status <> 'archived';

  if coalesce(array_length(v_source_ids, 1), 0) = 0 then
    raise exception 'No mergeable duplicate records selected';
  end if;

  insert into public.wpi_equipment_catalog_parameters (
    organization_id, equipment_catalog_id, parameter_code, parameter_name,
    raw_value, normalized_value, data_type, unit, minimum_value, maximum_value,
    is_key, source_page, source_evidence, confidence, review_status,
    created_by, updated_by, created_at, updated_at
  )
  select
    parameter.organization_id, p_target_id, parameter.parameter_code,
    parameter.parameter_name, parameter.raw_value, parameter.normalized_value,
    parameter.data_type, parameter.unit, parameter.minimum_value,
    parameter.maximum_value, parameter.is_key, parameter.source_page,
    parameter.source_evidence, parameter.confidence, parameter.review_status,
    parameter.created_by, v_actor, parameter.created_at, now()
  from public.wpi_equipment_catalog_parameters parameter
  where parameter.equipment_catalog_id = any(v_source_ids)
  on conflict (equipment_catalog_id, parameter_code) do update
  set confidence = greatest(public.wpi_equipment_catalog_parameters.confidence, excluded.confidence),
      source_evidence = case
        when excluded.confidence > public.wpi_equipment_catalog_parameters.confidence
          then excluded.source_evidence
        else public.wpi_equipment_catalog_parameters.source_evidence
      end,
      updated_by = v_actor,
      updated_at = now();

  insert into public.wpi_supplier_equipment_catalog (
    organization_id, supplier_id, equipment_catalog_id, supply_type,
    authorized_status, service_regions, evidence_url, confidence,
    review_status, metadata, created_by, updated_by, created_at, updated_at
  )
  select
    relation.organization_id, relation.supplier_id, p_target_id,
    relation.supply_type, relation.authorized_status, relation.service_regions,
    relation.evidence_url, relation.confidence, relation.review_status,
    relation.metadata, relation.created_by, v_actor, relation.created_at, now()
  from public.wpi_supplier_equipment_catalog relation
  where relation.equipment_catalog_id = any(v_source_ids)
  on conflict (organization_id, supplier_id, equipment_catalog_id) do update
  set confidence = greatest(public.wpi_supplier_equipment_catalog.confidence, excluded.confidence),
      updated_by = v_actor,
      updated_at = now();

  update public.wpi_equipment_prices
  set equipment_catalog_id = p_target_id, updated_by = v_actor
  where organization_id = v_organization_id
    and equipment_catalog_id = any(v_source_ids);

  update public.wpi_project_pricing_items
  set equipment_catalog_id = p_target_id
  where organization_id = v_organization_id
    and equipment_catalog_id = any(v_source_ids);

  insert into public.wpi_equipment_catalog_reviews (
    organization_id, equipment_catalog_id, reviewer_id, decision, notes
  )
  select
    v_organization_id, source_id, v_actor, 'archived'::public.wpi_review_status,
    left('Merged into ' || p_target_id::text || '. ' || coalesce(p_notes, ''), 2000)
  from unnest(v_source_ids) source_id;

  update public.wpi_equipment_catalog
  set review_status = 'archived',
      duplicate_of_catalog_id = p_target_id,
      duplicate_score = coalesce(duplicate_score, 100),
      assigned_reviewer_id = null,
      review_due_at = null,
      metadata = metadata || jsonb_build_object(
        'mergedIntoCatalogId', p_target_id,
        'mergedAt', now(),
        'mergedBy', v_actor,
        'mergeNote', left(coalesce(p_notes, ''), 500)
      ),
      updated_by = v_actor
  where id = any(v_source_ids);
  get diagnostics v_merged_count = row_count;

  update public.wpi_equipment_catalog
  set metadata = metadata || jsonb_build_object(
        'lastDuplicateMergeAt', now(),
        'lastDuplicateMergeCount', v_merged_count
      ),
      updated_by = v_actor
  where id = p_target_id;

  return jsonb_build_object(
    'targetId', p_target_id,
    'mergedIds', to_jsonb(v_source_ids),
    'mergedCount', v_merged_count
  );
end;
$$
revoke all on function private.wpi_merge_equipment_catalog_duplicates_impl(uuid, uuid[], text)
  from public, anon
grant execute on function private.wpi_merge_equipment_catalog_duplicates_impl(uuid, uuid[], text)
  to authenticated, service_role
create or replace function public.wpi_merge_equipment_catalog_duplicates(
  p_target_id uuid,
  p_source_ids uuid[],
  p_notes text default ''
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.wpi_merge_equipment_catalog_duplicates_impl(
    p_target_id,
    p_source_ids,
    p_notes
  );
$$
revoke all on function public.wpi_merge_equipment_catalog_duplicates(uuid, uuid[], text)
  from public, anon
grant execute on function public.wpi_merge_equipment_catalog_duplicates(uuid, uuid[], text)
  to authenticated, service_role
