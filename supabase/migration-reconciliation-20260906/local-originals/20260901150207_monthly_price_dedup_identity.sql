create or replace function private.wpi_price_period_identity(
  price_date date,
  period_granularity text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when price_date is null then 'unknown'
    when period_granularity = 'month' then to_char(date_trunc('month', price_date)::date, 'YYYY-MM')
    else to_char(price_date, 'YYYY-MM-DD')
  end;
$$;

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
  threshold_value numeric := 85;
  period_identity text;
begin
  new.normalized_name := private.wpi_normalize_collection_text(new.name);
  new.normalized_specification := private.wpi_normalize_collection_text(new.specification);
  new.normalized_unit := private.wpi_normalize_collection_text(new.original_unit);
  period_identity := private.wpi_price_period_identity(new.quote_date, new.price_period_granularity);
  new.fingerprint := md5(concat_ws('|',
    new.target_type,
    new.normalized_name,
    new.normalized_specification,
    new.normalized_unit,
    private.wpi_normalize_collection_text(new.region),
    period_identity
  ));
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
    select coalesce((config ->> 'dedupThreshold')::numeric, 85) into threshold_value
    from public.wpi_price_collection_tasks where id = new.task_id;
  end if;
  select candidate.* into comparison
  from public.wpi_price_collection_leads candidate
  where candidate.organization_id = new.organization_id
    and candidate.id <> coalesce(new.id, gen_random_uuid())
    and candidate.target_type = new.target_type
    and candidate.status <> 'rejected'
    and candidate.price_validity_status <> 'invalid'
    and private.wpi_price_period_identity(candidate.quote_date, candidate.price_period_granularity) = period_identity
    and (
      candidate.fingerprint = new.fingerprint
      or (
        coalesce(candidate.normalized_unit, '') = coalesce(new.normalized_unit, '')
        and private.wpi_normalize_collection_text(candidate.region) = private.wpi_normalize_collection_text(new.region)
        and extensions.similarity(
          coalesce(candidate.normalized_name, '') || ' ' || coalesce(candidate.normalized_specification, ''),
          new.normalized_name || ' ' || new.normalized_specification
        ) >= threshold_value / 100.0
      )
    )
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

create or replace function public.wpi_ingest_price_collection_candidate(
  target_task_id uuid,
  target_run_id uuid,
  target_source_id uuid,
  candidate jsonb,
  evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.wpi_price_collection_tasks;
  run_row public.wpi_price_collection_runs;
  lead_row public.wpi_price_collection_leads;
  existing_row public.wpi_price_collection_leads;
  evidence_row public.wpi_price_collection_evidence;
  lead_fingerprint text;
  candidate_name text := nullif(btrim(candidate ->> 'name'), '');
  candidate_spec text := nullif(btrim(candidate ->> 'specification'), '');
  candidate_url text := nullif(btrim(evidence ->> 'sourceUrl'), '');
  candidate_quote_date date;
  candidate_granularity text;
  candidate_period_identity text;
  was_created boolean := false;
begin
  if candidate_name is null then raise exception 'Candidate name is required'; end if;
  if coalesce(candidate ->> 'quoteDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    candidate_quote_date := (candidate ->> 'quoteDate')::date;
  end if;
  candidate_granularity := case
    when candidate_quote_date is null then 'unknown'
    when coalesce(evidence #>> '{metadata,pricePeriodGranularity}', '') = 'month' then 'month'
    when extract(day from candidate_quote_date) = 1 and coalesce(evidence #>> '{metadata,reportPeriod}', '') <> '' then 'month'
    else 'day'
  end;
  candidate_period_identity := private.wpi_price_period_identity(candidate_quote_date, candidate_granularity);

  select * into task_row from public.wpi_price_collection_tasks where id = target_task_id for update;
  if task_row.id is null then raise exception 'Collection task not found'; end if;
  select * into run_row from public.wpi_price_collection_runs
    where id = target_run_id and task_id = target_task_id for update;
  if run_row.id is null then raise exception 'Collection run not found'; end if;
  if target_source_id is not null and not exists (
    select 1 from public.wpi_price_collection_sources
    where id = target_source_id and organization_id = task_row.organization_id and is_active
  ) then raise exception 'Collection source is not active'; end if;

  lead_fingerprint := md5(concat_ws('|',
    coalesce(candidate ->> 'targetType', task_row.target_type),
    private.wpi_normalize_collection_text(candidate_name),
    private.wpi_normalize_collection_text(candidate_spec),
    private.wpi_normalize_collection_text(candidate ->> 'unit'),
    private.wpi_normalize_collection_text(coalesce(candidate ->> 'region', task_row.region)),
    candidate_period_identity
  ));

  select * into existing_row
  from public.wpi_price_collection_leads
  where organization_id = task_row.organization_id
    and fingerprint = lead_fingerprint
    and coalesce(source_url, '') = coalesce(candidate_url, '')
    and private.wpi_price_period_identity(quote_date, price_period_granularity) = candidate_period_identity
    and status <> 'rejected'
  order by created_at desc
  limit 1
  for update;

  if existing_row.id is not null then
    update public.wpi_price_collection_leads
    set price = greatest(0, coalesce((candidate ->> 'price')::numeric, price)),
        currency = upper(coalesce(nullif(candidate ->> 'currency', ''), currency)),
        supplier_name = coalesce(nullif(candidate ->> 'supplierName', ''), supplier_name),
        quote_date = coalesce(candidate_quote_date, quote_date),
        price_period_granularity = candidate_granularity,
        source_checked_at = now(),
        last_seen_at = now(),
        observation_count = observation_count + 1,
        run_id = target_run_id,
        source_id = target_source_id,
        metadata = metadata || jsonb_build_object(
          'lastObservationAt', now(),
          'incrementalUpdate', true,
          'previousPrice', existing_row.price,
          'pricePeriodIdentity', candidate_period_identity,
          'samePeriodPolicy', 'update_observation'
        ),
        updated_by = task_row.created_by
    where id = existing_row.id
    returning * into lead_row;
  else
    insert into public.wpi_price_collection_leads (
      organization_id, task_id, run_id, source_id, lead_code, target_type,
      name, specification, source_type, source_url, source_checked_at,
      evidence_code, region, price, currency, normalized_price, original_unit,
      supplier_name, match_target, ai_match_score, source_quality_score,
      collection_mode, status, quote_date, price_period_granularity,
      metadata, created_by, updated_by
    ) values (
      task_row.organization_id, task_row.id, run_row.id, target_source_id,
      'LS' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)),
      case when candidate ->> 'targetType' = 'material' then 'material' else task_row.target_type end,
      candidate_name, candidate_spec,
      coalesce(nullif(candidate ->> 'sourceType', ''), task_row.source_type),
      candidate_url, now(),
      coalesce(nullif(evidence ->> 'evidenceCode', ''), 'EV-COL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
      coalesce(nullif(candidate ->> 'region', ''), task_row.region),
      greatest(0, coalesce((candidate ->> 'price')::numeric, 0)),
      upper(coalesce(nullif(candidate ->> 'currency', ''), task_row.currency, 'CNY')),
      greatest(0, coalesce((candidate ->> 'price')::numeric, 0)),
      nullif(candidate ->> 'unit', ''), nullif(candidate ->> 'supplierName', ''),
      nullif(candidate ->> 'matchTarget', ''),
      greatest(0, least(100, coalesce((candidate ->> 'matchScore')::numeric, 50))),
      greatest(0, least(100, coalesce((candidate ->> 'sourceQuality')::numeric, 60))),
      task_row.collection_mode, 'pending_review', candidate_quote_date, candidate_granularity,
      jsonb_build_object(
        'rawCandidate', candidate,
        'aiFinalDecision', false,
        'incrementalUpdate', false,
        'pricePeriodIdentity', candidate_period_identity,
        'crossPeriodPolicy', 'create_new'
      ),
      task_row.created_by, task_row.created_by
    ) returning * into lead_row;
    was_created := true;
  end if;

  insert into public.wpi_price_collection_evidence (
    organization_id, task_id, run_id, lead_id, source_id, evidence_code,
    source_url, canonical_url, page_title, excerpt, content_hash, http_status,
    mime_type, fetched_at, metadata, created_by
  ) values (
    task_row.organization_id, target_task_id, target_run_id, lead_row.id, target_source_id,
    coalesce(nullif(evidence ->> 'evidenceCode', ''), 'EV-COL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
    candidate_url, nullif(evidence ->> 'canonicalUrl', ''),
    nullif(evidence ->> 'pageTitle', ''), left(coalesce(evidence ->> 'excerpt', ''), 8000),
    md5(concat_ws('|', coalesce(candidate_url, ''), candidate_name, candidate_spec, candidate_period_identity, coalesce(evidence ->> 'excerpt', ''))),
    greatest(100, least(599, coalesce((evidence ->> 'httpStatus')::integer, 200))),
    coalesce(nullif(evidence ->> 'mimeType', ''), 'text/html'), now(),
    coalesce(evidence -> 'metadata', '{}'::jsonb) || jsonb_build_object('pricePeriodIdentity', candidate_period_identity),
    task_row.created_by
  ) on conflict (organization_id, task_id, observation_key)
    where observation_key is not null
  do update
    set lead_id = excluded.lead_id,
        run_id = excluded.run_id,
        source_id = excluded.source_id,
        source_url = excluded.source_url,
        canonical_url = excluded.canonical_url,
        page_title = excluded.page_title,
        excerpt = excluded.excerpt,
        content_hash = excluded.content_hash,
        http_status = excluded.http_status,
        mime_type = excluded.mime_type,
        fetched_at = excluded.fetched_at,
        last_seen_at = excluded.fetched_at,
        observation_count = public.wpi_price_collection_evidence.observation_count + 1,
        metadata = public.wpi_price_collection_evidence.metadata || excluded.metadata || jsonb_build_object(
          'previousContentHash', public.wpi_price_collection_evidence.content_hash,
          'incrementalObservation', true
        )
  returning * into evidence_row;

  return jsonb_build_object(
    'leadId', lead_row.id,
    'leadCode', lead_row.lead_code,
    'evidenceId', evidence_row.id,
    'created', was_created,
    'updated', not was_created,
    'duplicate', lead_row.duplicate_status = 'suspected_duplicate',
    'pricePeriodIdentity', candidate_period_identity,
    'confidence', lead_row.confidence,
    'riskLevel', lead_row.risk_level,
    'normalizedPriceCny', lead_row.normalized_price_cny
  );
end;
$$;

revoke all on function public.wpi_ingest_price_collection_candidate(uuid, uuid, uuid, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.wpi_ingest_price_collection_candidate(uuid, uuid, uuid, jsonb, jsonb)
to service_role;

create index if not exists wpi_collection_lead_period_identity_idx
  on public.wpi_price_collection_leads (
    organization_id,
    fingerprint,
    source_url,
    quote_date
  )
  where status <> 'rejected';

update public.wpi_price_collection_tasks
set config = config
  || jsonb_build_object(
    'dedupThreshold', coalesce((config ->> 'dedupThreshold')::integer, 85),
    'dedupScope', 'item_source_price_period',
    'samePeriodPolicy', 'update_observation',
    'crossPeriodPolicy', 'create_new'
  ),
  updated_at = now()
where collection_mode in ('web', 'api');

update public.wpi_price_collection_leads
set quote_date = quote_date;

comment on function private.wpi_price_period_identity(date, text) is
  'Stable price-period identity used by incremental collection. Monthly observations share YYYY-MM; daily observations use YYYY-MM-DD.';
comment on function public.wpi_ingest_price_collection_candidate(uuid, uuid, uuid, jsonb, jsonb) is
  'Incremental candidate ingest: observations in the same source/item/region/price period update one lead; a different price period creates a new lead for trend analysis.';
