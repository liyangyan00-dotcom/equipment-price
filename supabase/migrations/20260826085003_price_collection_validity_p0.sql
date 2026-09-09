alter table public.wpi_price_collection_leads
  add column if not exists price_validity_status text not null default 'needs_review',
  add column if not exists price_validation_reasons text[] not null default '{}'::text[],
  add column if not exists price_original_text text,
  add column if not exists price_context_excerpt text,
  add column if not exists is_comparable boolean not null default false,
  add column if not exists comparison_key text,
  add column if not exists fx_status text not null default 'pending',
  add column if not exists fx_rate_date date,
  add column if not exists fx_source text;

alter table public.wpi_price_collection_leads
  drop constraint if exists wpi_price_collection_leads_validity_check;
alter table public.wpi_price_collection_leads
  add constraint wpi_price_collection_leads_validity_check
  check (price_validity_status in ('valid', 'needs_review', 'invalid'));

alter table public.wpi_price_collection_leads
  drop constraint if exists wpi_price_collection_leads_fx_status_check;
alter table public.wpi_price_collection_leads
  add constraint wpi_price_collection_leads_fx_status_check
  check (fx_status in ('verified', 'missing_rate', 'pending'));

create index if not exists wpi_price_collection_leads_validity_idx
  on public.wpi_price_collection_leads(organization_id, price_validity_status, created_at desc);

create or replace function private.wpi_refresh_price_lead_validity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  reasons text[] := '{}'::text[];
  candidate jsonb := coalesce(new.metadata -> 'rawCandidate', '{}'::jsonb);
  supplied_reasons jsonb := coalesce(candidate -> 'validationReasons', '[]'::jsonb);
  extraction_invalid boolean := coalesce((new.metadata ->> 'extractionInvalid')::boolean, false)
    or coalesce((candidate ->> 'validationStatus') = 'invalid', false);
  supplied_reason text;
  detected_currency text := upper(nullif(new.metadata ->> 'detectedCurrency', ''));
begin
  new.price_original_text := coalesce(
    nullif(new.price_original_text, ''),
    nullif(candidate ->> 'originalPriceText', ''),
    concat_ws(' ', nullif(new.currency, ''), new.price::text)
  );
  new.price_context_excerpt := coalesce(
    nullif(new.price_context_excerpt, ''),
    nullif(candidate ->> 'priceContext', '')
  );

  if jsonb_typeof(supplied_reasons) = 'array' then
    for supplied_reason in select jsonb_array_elements_text(supplied_reasons)
    loop
      if supplied_reason <> '' and not supplied_reason = any(reasons) then
        reasons := array_append(reasons, supplied_reason);
      end if;
    end loop;
  end if;
  supplied_reason := nullif(new.metadata ->> 'invalidReason', '');
  if supplied_reason is not null and not supplied_reason = any(reasons) then
    reasons := array_append(reasons, supplied_reason);
  end if;
  if detected_currency is not null and detected_currency <> upper(coalesce(new.currency, '')) then
    reasons := array_append(reasons, 'currency_mismatch');
  end if;
  if nullif(new.name, '') is null then reasons := array_append(reasons, 'missing_product_name'); end if;
  if new.price is null or new.price <= 0 then reasons := array_append(reasons, 'invalid_price'); end if;
  if nullif(new.currency, '') is null or upper(new.currency) not in ('CNY', 'USD', 'EUR', 'CDF') then
    reasons := array_append(reasons, 'unsupported_currency');
  end if;
  if nullif(new.specification, '') is null then reasons := array_append(reasons, 'missing_specification'); end if;
  if nullif(new.original_unit, '') is null then reasons := array_append(reasons, 'missing_unit'); end if;
  if new.collection_mode = 'web' and nullif(new.price_context_excerpt, '') is null then
    reasons := array_append(reasons, 'missing_price_context');
  end if;

  reasons := array(select distinct reason from unnest(reasons) reason where reason <> '');
  if extraction_invalid or reasons && array[
    'shipping_threshold_not_product_price',
    'missing_keyword_near_price',
    'non_product_number',
    'contact_number',
    'minimum_order_amount'
  ]::text[] then
    new.price_validity_status := 'invalid';
  elsif cardinality(reasons) > 0 then
    new.price_validity_status := 'needs_review';
  else
    new.price_validity_status := 'valid';
  end if;

  new.price_validation_reasons := reasons;
  new.is_comparable := new.price_validity_status = 'valid';
  new.comparison_key := case when new.is_comparable then md5(concat_ws('|',
    new.target_type,
    private.wpi_normalize_collection_text(new.name),
    private.wpi_normalize_collection_text(new.specification),
    private.wpi_normalize_collection_text(new.original_unit),
    upper(new.currency),
    private.wpi_normalize_collection_text(new.region)
  )) else null end;
  return new;
end;
$$;

drop trigger if exists wpi_refresh_price_lead_validity on public.wpi_price_collection_leads;
drop trigger if exists wpi_00_refresh_price_lead_validity on public.wpi_price_collection_leads;
create trigger wpi_00_refresh_price_lead_validity
before insert or update of name, specification, original_unit, region, price, currency,
  collection_mode, metadata, price_original_text, price_context_excerpt
on public.wpi_price_collection_leads
for each row execute function private.wpi_refresh_price_lead_validity();

create or replace function private.wpi_guard_price_lead_validity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('ready', 'transferred') and new.price_validity_status <> 'valid' then
    raise exception '价格记录尚未通过有效性准入，不能确认或转入正式线索';
  end if;
  return new;
end;
$$;

drop trigger if exists wpi_guard_price_lead_validity on public.wpi_price_collection_leads;
create trigger wpi_guard_price_lead_validity
before insert or update of status
on public.wpi_price_collection_leads
for each row execute function private.wpi_guard_price_lead_validity();

create or replace function private.wpi_prepare_collection_lead()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rate_value numeric(20,8);
  rate_effective_at timestamptz;
  rate_source_name text;
  comparison public.wpi_price_collection_leads;
  similarity_value numeric(5,2) := 0;
  threshold_value numeric := 86;
begin
  new.normalized_name := private.wpi_normalize_collection_text(new.name);
  new.normalized_specification := private.wpi_normalize_collection_text(new.specification);
  new.normalized_unit := private.wpi_normalize_collection_text(new.original_unit);
  new.fingerprint := md5(concat_ws('|', new.target_type, new.normalized_name, new.normalized_specification, new.normalized_unit, private.wpi_normalize_collection_text(new.region)));
  new.last_seen_at := coalesce(new.last_seen_at, now());

  if upper(new.currency) = 'CNY' then
    rate_value := 1;
    rate_effective_at := coalesce(new.source_checked_at, now());
    rate_source_name := 'system_identity';
  else
    select rate, effective_at, source_name
      into rate_value, rate_effective_at, rate_source_name
    from public.wpi_currency_rates
    where organization_id = new.organization_id
      and base_currency = upper(new.currency)
      and quote_currency = 'CNY'
      and effective_at <= coalesce(new.source_checked_at, now())
    order by effective_at desc
    limit 1;
  end if;
  if rate_value is null then
    new.exchange_rate := null;
    new.normalized_price_cny := null;
    new.fx_status := 'missing_rate';
    new.fx_rate_date := null;
    new.fx_source := null;
  else
    new.exchange_rate := rate_value;
    new.normalized_price_cny := round(new.price * rate_value, 2);
    new.fx_status := 'verified';
    new.fx_rate_date := rate_effective_at::date;
    new.fx_source := rate_source_name;
  end if;

  if new.source_quality_score is null then
    select quality_score into new.source_quality_score
    from public.wpi_price_collection_sources where id = new.source_id;
  end if;
  new.source_quality_score := coalesce(new.source_quality_score, 60);
  new.freshness_score := coalesce(new.freshness_score,
    greatest(0, 100 - extract(day from now() - coalesce(new.source_checked_at, now())) * 2));
  new.confidence := round(
    new.source_quality_score * 0.40
    + new.freshness_score * 0.20
    + coalesce(new.ai_match_score, 50) * 0.20
    + (case when nullif(new.specification, '') is null then 35 else 100 end) * 0.10
    + (case when nullif(new.original_unit, '') is null then 25 else 100 end) * 0.10,
    2
  );

  if new.task_id is not null then
    select coalesce((config ->> 'dedupThreshold')::numeric, 86) into threshold_value
    from public.wpi_price_collection_tasks where id = new.task_id;
  end if;
  select candidate.* into comparison
  from public.wpi_price_collection_leads candidate
  where candidate.organization_id = new.organization_id
    and candidate.id <> coalesce(new.id, gen_random_uuid())
    and candidate.target_type = new.target_type
    and candidate.status <> 'rejected'
    and candidate.price_validity_status <> 'invalid'
    and (candidate.fingerprint = new.fingerprint or extensions.similarity(
      coalesce(candidate.normalized_name, '') || ' ' || coalesce(candidate.normalized_specification, ''),
      new.normalized_name || ' ' || new.normalized_specification
    ) >= threshold_value / 100.0)
  order by (candidate.fingerprint = new.fingerprint) desc,
    extensions.similarity(coalesce(candidate.normalized_name, '') || ' ' || coalesce(candidate.normalized_specification, ''), new.normalized_name || ' ' || new.normalized_specification) desc
  limit 1;
  if comparison.id is not null then
    similarity_value := round((extensions.similarity(
      coalesce(comparison.normalized_name, '') || ' ' || coalesce(comparison.normalized_specification, ''),
      new.normalized_name || ' ' || new.normalized_specification
    ) * 100)::numeric, 2);
    new.duplicate_of_lead_id := comparison.id;
    new.duplicate_score := case when comparison.fingerprint = new.fingerprint then 100 else similarity_value end;
    new.duplicate_status := 'suspected_duplicate';
  else
    new.duplicate_of_lead_id := null;
    new.duplicate_score := 0;
    new.duplicate_status := 'unique';
  end if;
  if new.price_validity_status = 'invalid' or new.price <= 0 or new.confidence < 50 then
    new.risk_level := 'high';
  elsif new.price_validity_status = 'needs_review' or new.duplicate_status = 'suspected_duplicate' or new.confidence < 75 then
    new.risk_level := 'medium';
  else
    new.risk_level := coalesce(new.risk_level, 'low');
  end if;
  return new;
end;
$$;

create or replace function public.wpi_search_price_collection_leads_v3(
  search_keyword text default null,
  filter_task_id uuid default null,
  filter_target_type text default null,
  filter_source_type text default null,
  filter_region text default null,
  filter_status text default null,
  filter_risk_level text default null,
  filter_min_match numeric default null,
  filter_max_match numeric default null,
  filter_min_confidence numeric default null,
  filter_max_confidence numeric default null,
  filter_date_from date default null,
  filter_date_to date default null,
  filter_assignee text default null,
  filter_validity_status text default null,
  page_number integer default 1,
  page_size integer default 10
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with scoped as materialized (
    select lead.* from public.wpi_price_collection_leads lead
    where (nullif(btrim(search_keyword), '') is null
      or lead.lead_code ilike '%' || btrim(search_keyword) || '%'
      or lead.name ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.specification, '') ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.supplier_name, '') ilike '%' || btrim(search_keyword) || '%')
      and (filter_task_id is null or lead.task_id = filter_task_id)
      and (nullif(filter_target_type, '') is null or lead.target_type = filter_target_type)
      and (nullif(filter_source_type, '') is null or lead.source_type = filter_source_type)
      and (nullif(filter_region, '') is null or lead.region = filter_region)
      and (nullif(filter_status, '') is null or lead.status = filter_status)
      and (nullif(filter_risk_level, '') is null or lead.risk_level::text = filter_risk_level)
      and (filter_min_match is null or coalesce(lead.ai_match_score, 0) >= filter_min_match)
      and (filter_max_match is null or coalesce(lead.ai_match_score, 0) <= filter_max_match)
      and (filter_min_confidence is null or coalesce(lead.confidence, 0) >= filter_min_confidence)
      and (filter_max_confidence is null or coalesce(lead.confidence, 0) < filter_max_confidence)
      and (filter_date_from is null or lead.created_at >= filter_date_from::timestamptz)
      and (filter_date_to is null or lead.created_at < (filter_date_to + 1)::timestamptz)
      and (nullif(filter_assignee, '') is null
        or (filter_assignee = 'unassigned' and lead.assigned_reviewer_id is null)
        or (filter_assignee <> 'unassigned' and lead.assigned_reviewer_id = filter_assignee::uuid))
  ), filtered as materialized (
    select * from scoped
    where nullif(filter_validity_status, '') is null or price_validity_status = filter_validity_status
  ), page_rows as (
    select * from filtered order by created_at desc, id desc
    limit greatest(1, least(coalesce(page_size, 10), 100))
    offset (greatest(coalesce(page_number, 1), 1) - 1) * greatest(1, least(coalesce(page_size, 10), 100))
  ), source_distribution as (
    select source_type as label, count(*)::integer as count from filtered group by source_type
  ), status_distribution as (
    select status as label, count(*)::integer as count from filtered group by status
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows) order by created_at desc, id desc) from page_rows), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', greatest(coalesce(page_number, 1), 1),
      'pageSize', greatest(1, least(coalesce(page_size, 10), 100)),
      'total', (select count(*) from filtered),
      'pageCount', greatest(1, ceil((select count(*) from filtered)::numeric / greatest(1, least(coalesce(page_size, 10), 100)))::integer)),
    'summary', jsonb_build_object(
      'total', (select count(*) from filtered),
      'pending', (select count(*) from filtered where status = 'pending_review'),
      'ready', (select count(*) from filtered where status = 'ready'),
      'transferred', (select count(*) from filtered where status = 'transferred'),
      'rejected', (select count(*) from filtered where status = 'rejected'),
      'highRisk', (select count(*) from filtered where risk_level::text in ('high', 'critical')),
      'unassigned', (select count(*) from filtered where assigned_reviewer_id is null),
      'overdue', (select count(*) from filtered where status = 'pending_review' and review_due_at < now()),
      'averageConfidence', coalesce((select round(avg(confidence), 1) from filtered), 0),
      'averageMatch', coalesce((select round(avg(ai_match_score), 1) from filtered), 0),
      'valid', (select count(*) from scoped where price_validity_status = 'valid'),
      'needsReview', (select count(*) from scoped where price_validity_status = 'needs_review'),
      'invalid', (select count(*) from scoped where price_validity_status = 'invalid')),
    'sourceDistribution', coalesce((select jsonb_agg(to_jsonb(source_distribution) order by count desc, label) from source_distribution), '[]'::jsonb),
    'statusDistribution', coalesce((select jsonb_agg(to_jsonb(status_distribution) order by count desc, label) from status_distribution), '[]'::jsonb));
$$;

grant execute on function public.wpi_search_price_collection_leads_v3(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, integer, integer
) to authenticated, service_role;

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
      and price_validity_status = 'valid'
      and is_comparable
      and normalized_price_cny > 0
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
      100::numeric(5,2) as match_score,
      round((equipment.original_price - lead.price) / lead.price * 100, 2) as price_delta_pct
    from lead
    join public.wpi_equipment_prices equipment
      on lead.target_type = 'equipment'
     and equipment.organization_id = lead.organization_id
     and equipment.deleted_at is null
     and private.wpi_normalize_collection_text(equipment.equipment_name) = lead.normalized_name
     and private.wpi_normalize_collection_text(coalesce(equipment.model, equipment.technical_parameters ->> 'specification', '')) = lead.normalized_specification
     and private.wpi_normalize_collection_text(coalesce(equipment.technical_parameters ->> 'unit', '')) = lead.normalized_unit
     and private.wpi_normalize_collection_text(coalesce(equipment.technical_parameters ->> 'region', '')) = private.wpi_normalize_collection_text(lead.region)
     and upper(equipment.original_currency) = upper(lead.currency)

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
      100::numeric(5,2),
      round((material.price - lead.price) / lead.price * 100, 2)
    from lead
    join public.wpi_material_prices material
      on lead.target_type = 'material'
     and material.organization_id = lead.organization_id
     and private.wpi_normalize_collection_text(material.material_name) = lead.normalized_name
     and private.wpi_normalize_collection_text(coalesce(material.specification, '')) = lead.normalized_specification
     and private.wpi_normalize_collection_text(material.unit) = lead.normalized_unit
     and private.wpi_normalize_collection_text(coalesce(material.region, '')) = private.wpi_normalize_collection_text(lead.region)
     and upper(material.currency) = upper(lead.currency)
  )
  select * from candidates
  order by recorded_at desc
  limit greatest(1, least(coalesce(match_limit, 5), 20));
$$;

revoke all on function public.wpi_find_price_collection_history_matches(uuid, integer)
  from public, anon;
grant execute on function public.wpi_find_price_collection_history_matches(uuid, integer)
  to authenticated;

update public.wpi_price_collection_leads
set currency = upper(metadata ->> 'detectedCurrency')
where upper(coalesce(metadata ->> 'detectedCurrency', '')) in ('CNY', 'USD', 'EUR', 'CDF')
  and upper(metadata ->> 'detectedCurrency') <> upper(currency);

update public.wpi_price_collection_leads
set metadata = metadata,
    price_context_excerpt = coalesce(price_context_excerpt, metadata #>> '{rawCandidate,priceContext}'),
    price_original_text = coalesce(price_original_text, metadata #>> '{rawCandidate,originalPriceText}');

update public.wpi_price_collection_leads
set currency = currency
where currency is not null;

comment on column public.wpi_price_collection_leads.price_validity_status is
  'Price admission result: valid, needs_review, or invalid. Invalid records are parsing anomalies, not usable prices.';

;
