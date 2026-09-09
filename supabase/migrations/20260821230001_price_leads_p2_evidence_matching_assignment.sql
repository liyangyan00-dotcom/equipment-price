alter table public.wpi_price_collection_leads
  add column if not exists assigned_reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assignment_note text,
  add column if not exists review_due_at timestamptz;

alter table public.wpi_price_collection_evidence
  add column if not exists snapshot_kind text not null default 'collector'
    check (snapshot_kind in ('collector', 'manual_review', 'quote_document')),
  add column if not exists snapshot_payload jsonb not null default '{}'::jsonb,
  add column if not exists captured_by uuid references auth.users(id) on delete set null,
  add column if not exists captured_at timestamptz not null default now();

create index if not exists wpi_collection_leads_org_assignee_status_idx
  on public.wpi_price_collection_leads(
    organization_id,
    assigned_reviewer_id,
    status,
    created_at desc
  );

create index if not exists wpi_collection_leads_org_target_name_idx
  on public.wpi_price_collection_leads(organization_id, target_type, normalized_name);

create index if not exists wpi_collection_evidence_lead_snapshot_idx
  on public.wpi_price_collection_evidence(lead_id, captured_at desc);

create or replace function private.wpi_list_price_reviewers_impl()
returns table (
  user_id uuid,
  display_name text,
  role text,
  is_current_user boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_org_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select organization_id
  into current_org_id
  from public.wpi_organization_members
  where user_id = current_user_id
    and is_active
  order by joined_at
  limit 1;

  if current_org_id is null
     or not private.wpi_has_permission(current_org_id, 'price.read') then
    raise exception 'Active organization membership is required';
  end if;

  return query
  select
    member.user_id,
    coalesce(nullif(profile.display_name, ''), '审核成员') as display_name,
    member.role::text,
    member.user_id = current_user_id
  from public.wpi_organization_members member
  left join public.wpi_profiles profile on profile.id = member.user_id
  where member.organization_id = current_org_id
    and member.is_active
    and member.role::text in ('admin', 'manager', 'reviewer')
  order by
    case member.role::text
      when 'admin' then 1
      when 'manager' then 2
      else 3
    end,
    coalesce(profile.display_name, ''),
    member.user_id;
end;
$$;

revoke all on function private.wpi_list_price_reviewers_impl()
  from public, anon, authenticated;
grant execute on function private.wpi_list_price_reviewers_impl()
  to authenticated;

create or replace function public.wpi_list_price_reviewers()
returns table (
  user_id uuid,
  display_name text,
  role text,
  is_current_user boolean
)
language sql
security invoker
stable
set search_path = ''
as $$
  select * from private.wpi_list_price_reviewers_impl();
$$;

revoke all on function public.wpi_list_price_reviewers() from public, anon;
grant execute on function public.wpi_list_price_reviewers() to authenticated;

create or replace function private.wpi_assign_price_collection_leads_impl(
  target_lead_ids uuid[],
  target_reviewer_id uuid,
  assignment_notes text default null,
  due_at timestamptz default null
)
returns setof public.wpi_price_collection_leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_org_id uuid;
  expected_count integer;
  matched_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if coalesce(array_length(target_lead_ids, 1), 0) = 0 then
    raise exception 'At least one price lead is required';
  end if;

  expected_count := cardinality(target_lead_ids);

  select (array_agg(organization_id order by created_at, id))[1], count(*)
  into target_org_id, matched_count
  from public.wpi_price_collection_leads
  where id = any(target_lead_ids);

  if matched_count <> expected_count or target_org_id is null then
    raise exception 'One or more collection leads were not found';
  end if;
  if exists (
    select 1
    from public.wpi_price_collection_leads
    where id = any(target_lead_ids)
      and organization_id <> target_org_id
  ) then
    raise exception 'Price leads must belong to one organization';
  end if;
  if not private.wpi_has_permission(target_org_id, 'price.review') then
    raise exception 'Price review permission is required';
  end if;
  if not exists (
    select 1
    from public.wpi_organization_members
    where organization_id = target_org_id
      and user_id = target_reviewer_id
      and is_active
      and role::text in ('admin', 'manager', 'reviewer')
  ) then
    raise exception 'The assignee is not an active price reviewer in this organization';
  end if;

  return query
  update public.wpi_price_collection_leads
  set assigned_reviewer_id = target_reviewer_id,
      assigned_at = now(),
      assigned_by = current_user_id,
      assignment_note = nullif(btrim(assignment_notes), ''),
      review_due_at = due_at,
      updated_by = current_user_id
  where id = any(target_lead_ids)
    and status = 'pending_review'
  returning *;
end;
$$;

revoke all on function private.wpi_assign_price_collection_leads_impl(uuid[], uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function private.wpi_assign_price_collection_leads_impl(uuid[], uuid, text, timestamptz)
  to authenticated;

create or replace function public.wpi_assign_price_collection_leads(
  target_lead_ids uuid[],
  target_reviewer_id uuid,
  assignment_notes text default null,
  due_at timestamptz default null
)
returns setof public.wpi_price_collection_leads
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.wpi_assign_price_collection_leads_impl(
    target_lead_ids,
    target_reviewer_id,
    assignment_notes,
    due_at
  );
$$;

revoke all on function public.wpi_assign_price_collection_leads(uuid[], uuid, text, timestamptz)
  from public, anon;
grant execute on function public.wpi_assign_price_collection_leads(uuid[], uuid, text, timestamptz)
  to authenticated;

create or replace function private.wpi_capture_price_collection_snapshot_impl(
  target_lead_id uuid
)
returns public.wpi_price_collection_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_lead public.wpi_price_collection_leads;
  snapshot_row public.wpi_price_collection_evidence;
  snapshot_code text;
  payload jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select * into current_lead
  from public.wpi_price_collection_leads
  where id = target_lead_id;

  if current_lead.id is null then
    raise exception 'Collection lead not found';
  end if;
  if current_lead.task_id is null then
    raise exception 'The collection lead has no source task';
  end if;
  if not (
    private.wpi_has_permission(current_lead.organization_id, 'price.review')
    or private.wpi_has_permission(current_lead.organization_id, 'price.write')
  ) then
    raise exception 'Price review permission is required';
  end if;

  snapshot_code := 'EV-SNP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  payload := jsonb_build_object(
    'leadId', current_lead.id,
    'leadCode', current_lead.lead_code,
    'targetType', current_lead.target_type,
    'name', current_lead.name,
    'specification', current_lead.specification,
    'supplierName', current_lead.supplier_name,
    'region', current_lead.region,
    'unit', current_lead.original_unit,
    'price', current_lead.price,
    'currency', current_lead.currency,
    'normalizedPriceCny', current_lead.normalized_price_cny,
    'sourceType', current_lead.source_type,
    'sourceUrl', current_lead.source_url,
    'sourceCheckedAt', current_lead.source_checked_at,
    'confidence', current_lead.confidence,
    'riskLevel', current_lead.risk_level,
    'capturedAt', now()
  );

  insert into public.wpi_price_collection_evidence (
    organization_id,
    task_id,
    run_id,
    lead_id,
    source_id,
    quote_document_id,
    evidence_code,
    source_url,
    canonical_url,
    page_title,
    excerpt,
    content_hash,
    http_status,
    mime_type,
    fetched_at,
    metadata,
    created_by,
    snapshot_kind,
    snapshot_payload,
    captured_by,
    captured_at
  ) values (
    current_lead.organization_id,
    current_lead.task_id,
    current_lead.run_id,
    current_lead.id,
    current_lead.source_id,
    current_lead.quote_document_id,
    snapshot_code,
    current_lead.source_url,
    current_lead.source_url,
    current_lead.name || ' 来源证据快照',
    left(concat_ws(' · ', current_lead.name, current_lead.specification, current_lead.supplier_name), 8000),
    md5(current_lead.id::text || '|' || clock_timestamp()::text || '|' || payload::text),
    case when current_lead.source_url is null then null else 200 end,
    'application/vnd.wpi.price-evidence+json',
    now(),
    jsonb_build_object(
      'captureMode', 'manual_review',
      'immutableBusinessSnapshot', true,
      'aiFinalDecision', false
    ),
    current_user_id,
    'manual_review',
    payload,
    current_user_id,
    now()
  )
  returning * into snapshot_row;

  return snapshot_row;
end;
$$;

revoke all on function private.wpi_capture_price_collection_snapshot_impl(uuid)
  from public, anon, authenticated;
grant execute on function private.wpi_capture_price_collection_snapshot_impl(uuid)
  to authenticated;

create or replace function public.wpi_capture_price_collection_snapshot(target_lead_id uuid)
returns public.wpi_price_collection_evidence
language sql
security invoker
set search_path = ''
as $$
  select private.wpi_capture_price_collection_snapshot_impl(target_lead_id);
$$;

revoke all on function public.wpi_capture_price_collection_snapshot(uuid) from public, anon;
grant execute on function public.wpi_capture_price_collection_snapshot(uuid) to authenticated;

create or replace function public.wpi_find_price_collection_history_matches(
  target_lead_id uuid,
  match_limit integer default 5
)
returns table (
  record_id uuid,
  record_code text,
  target_type text,
  record_name text,
  record_specification text,
  record_price numeric,
  record_currency text,
  source_type text,
  recorded_at timestamptz,
  match_score numeric,
  price_delta_pct numeric
)
language sql
security invoker
stable
set search_path = ''
as $$
  with lead as (
    select *
    from public.wpi_price_collection_leads
    where id = target_lead_id
  ), candidates as (
    select
      equipment.id as record_id,
      equipment.price_code as record_code,
      'equipment'::text as target_type,
      equipment.equipment_name as record_name,
      coalesce(equipment.model, equipment.technical_parameters ->> 'specification', '') as record_specification,
      equipment.original_price as record_price,
      equipment.original_currency as record_currency,
      coalesce(equipment.source_type, '') as source_type,
      equipment.created_at as recorded_at,
      (
        case
          when lower(btrim(equipment.equipment_name)) = lower(btrim(lead.name)) then 55
          when equipment.equipment_name ilike '%' || lead.name || '%'
            or lead.name ilike '%' || equipment.equipment_name || '%' then 35
          else 0
        end
        + case
            when nullif(btrim(lead.specification), '') is not null
             and lower(btrim(coalesce(equipment.model, equipment.technical_parameters ->> 'specification', ''))) = lower(btrim(lead.specification)) then 30
            when nullif(btrim(lead.specification), '') is not null
             and coalesce(equipment.model, equipment.technical_parameters ->> 'specification', '') ilike '%' || lead.specification || '%' then 18
            else 0
          end
        + case
            when lead.normalized_price_cny > 0 and equipment.original_price > 0
              then greatest(0, 15 - abs(equipment.original_price - lead.normalized_price_cny) / lead.normalized_price_cny * 15)
            else 0
          end
      )::numeric(5,2) as match_score,
      case
        when lead.normalized_price_cny > 0
          then round((equipment.original_price - lead.normalized_price_cny) / lead.normalized_price_cny * 100, 2)
        else null
      end as price_delta_pct
    from lead
    join public.wpi_equipment_prices equipment
      on lead.target_type = 'equipment'
     and equipment.organization_id = lead.organization_id
     and equipment.deleted_at is null

    union all

    select
      material.id,
      material.price_code,
      'material'::text,
      material.material_name,
      coalesce(material.specification, ''),
      material.price,
      material.currency,
      coalesce(material.source_type, ''),
      material.created_at,
      (
        case
          when lower(btrim(material.material_name)) = lower(btrim(lead.name)) then 55
          when material.material_name ilike '%' || lead.name || '%'
            or lead.name ilike '%' || material.material_name || '%' then 35
          else 0
        end
        + case
            when nullif(btrim(lead.specification), '') is not null
             and lower(btrim(coalesce(material.specification, ''))) = lower(btrim(lead.specification)) then 25
            when nullif(btrim(lead.specification), '') is not null
             and coalesce(material.specification, '') ilike '%' || lead.specification || '%' then 15
            else 0
          end
        + case when lower(coalesce(material.unit, '')) = lower(coalesce(lead.original_unit, '')) then 5 else 0 end
        + case
            when lead.normalized_price_cny > 0 and material.price > 0
              then greatest(0, 15 - abs(material.price - lead.normalized_price_cny) / lead.normalized_price_cny * 15)
            else 0
          end
      )::numeric(5,2),
      case
        when lead.normalized_price_cny > 0
          then round((material.price - lead.normalized_price_cny) / lead.normalized_price_cny * 100, 2)
        else null
      end
    from lead
    join public.wpi_material_prices material
      on lead.target_type = 'material'
     and material.organization_id = lead.organization_id
  )
  select *
  from candidates
  where match_score >= 25
  order by match_score desc, recorded_at desc
  limit greatest(1, least(coalesce(match_limit, 5), 20));
$$;

revoke all on function public.wpi_find_price_collection_history_matches(uuid, integer)
  from public, anon;
grant execute on function public.wpi_find_price_collection_history_matches(uuid, integer)
  to authenticated;

create or replace function public.wpi_search_price_collection_leads(
  search_keyword text default null,
  filter_target_type text default null,
  filter_source_type text default null,
  filter_region text default null,
  filter_status text default null,
  filter_risk_level text default null,
  filter_min_match numeric default null,
  filter_max_match numeric default null,
  filter_date_from date default null,
  filter_date_to date default null,
  filter_assignee text default null,
  page_number integer default 1,
  page_size integer default 10
)
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  with filtered as materialized (
    select lead.*
    from public.wpi_price_collection_leads lead
    where (
      nullif(btrim(search_keyword), '') is null
      or lead.lead_code ilike '%' || btrim(search_keyword) || '%'
      or lead.name ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.specification, '') ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.supplier_name, '') ilike '%' || btrim(search_keyword) || '%'
    )
      and (nullif(filter_target_type, '') is null or lead.target_type = filter_target_type)
      and (nullif(filter_source_type, '') is null or lead.source_type = filter_source_type)
      and (nullif(filter_region, '') is null or lead.region = filter_region)
      and (nullif(filter_status, '') is null or lead.status = filter_status)
      and (nullif(filter_risk_level, '') is null or lead.risk_level::text = filter_risk_level)
      and (filter_min_match is null or coalesce(lead.ai_match_score, 0) >= filter_min_match)
      and (filter_max_match is null or coalesce(lead.ai_match_score, 0) <= filter_max_match)
      and (filter_date_from is null or lead.created_at >= filter_date_from::timestamptz)
      and (filter_date_to is null or lead.created_at < (filter_date_to + 1)::timestamptz)
      and (
        nullif(filter_assignee, '') is null
        or (filter_assignee = 'unassigned' and lead.assigned_reviewer_id is null)
        or (filter_assignee <> 'unassigned' and lead.assigned_reviewer_id = filter_assignee::uuid)
      )
  ), page_rows as (
    select *
    from filtered
    order by created_at desc, id desc
    limit greatest(1, least(coalesce(page_size, 10), 100))
    offset (greatest(coalesce(page_number, 1), 1) - 1)
      * greatest(1, least(coalesce(page_size, 10), 100))
  ), source_distribution as (
    select source_type as label, count(*)::integer as count
    from filtered
    group by source_type
  ), status_distribution as (
    select status as label, count(*)::integer as count
    from filtered
    group by status
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows) order by created_at desc, id desc) from page_rows), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', greatest(coalesce(page_number, 1), 1),
      'pageSize', greatest(1, least(coalesce(page_size, 10), 100)),
      'total', (select count(*) from filtered),
      'pageCount', greatest(1, ceil((select count(*) from filtered)::numeric / greatest(1, least(coalesce(page_size, 10), 100)))::integer)
    ),
    'summary', jsonb_build_object(
      'total', (select count(*) from filtered),
      'pending', (select count(*) from filtered where status = 'pending_review'),
      'ready', (select count(*) from filtered where status = 'ready'),
      'transferred', (select count(*) from filtered where status = 'transferred'),
      'rejected', (select count(*) from filtered where status = 'rejected'),
      'highRisk', (select count(*) from filtered where risk_level::text in ('high', 'critical')),
      'unassigned', (select count(*) from filtered where assigned_reviewer_id is null)
    ),
    'sourceDistribution', coalesce((select jsonb_agg(to_jsonb(source_distribution) order by count desc, label) from source_distribution), '[]'::jsonb),
    'statusDistribution', coalesce((select jsonb_agg(to_jsonb(status_distribution) order by count desc, label) from status_distribution), '[]'::jsonb)
  );
$$;

revoke all on function public.wpi_search_price_collection_leads(
  text, text, text, text, text, text, numeric, numeric, date, date, text, integer, integer
) from public, anon;
grant execute on function public.wpi_search_price_collection_leads(
  text, text, text, text, text, text, numeric, numeric, date, date, text, integer, integer
) to authenticated;

comment on column public.wpi_price_collection_leads.assigned_reviewer_id is
  'Active organization member responsible for the human price lead review.';
comment on column public.wpi_price_collection_evidence.snapshot_payload is
  'Immutable business evidence payload captured for later review and audit comparison.';
comment on function public.wpi_find_price_collection_history_matches(uuid, integer) is
  'Compares a collection lead with organization-scoped equipment or material price history under caller RLS.';
comment on function public.wpi_search_price_collection_leads(
  text, text, text, text, text, text, numeric, numeric, date, date, text, integer, integer
) is 'Server-side filtered and paginated price lead search under caller RLS.';

;
