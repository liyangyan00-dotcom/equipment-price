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

-- Verified daily CDF/CNY observation used to unblock the existing acceptance batch.
insert into public.wpi_currency_rates (
  organization_id,
  base_currency,
  quote_currency,
  rate,
  source_name,
  effective_at
)
select
  id,
  'CDF',
  'CNY',
  0.002939,
  'ExchangeRate-API open access (https://www.exchangerate-api.com)',
  timestamptz '2026-08-31 00:02:31+00'
from public.wpi_organizations
on conflict (organization_id, base_currency, quote_currency, effective_at)
do update set
  rate = excluded.rate,
  source_name = excluded.source_name;

-- Fire the preparation trigger so current observations pick up the verified rate
-- and regional duplicate rules without changing their review decisions.
update public.wpi_price_collection_leads
set source_checked_at = source_checked_at
where status <> 'rejected'
  and source_checked_at >= timestamptz '2026-08-31 00:02:31+00';

comment on function private.wpi_prepare_collection_lead()
is 'P0 lead preparation: verified FX conversion and region-aware duplicate detection.';
