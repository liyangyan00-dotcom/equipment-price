create or replace function private.wpi_transfer_price_collection_leads_impl(
  target_lead_ids uuid[]
)
returns setof public.wpi_price_collection_leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_lead public.wpi_price_collection_leads;
  current_user_id uuid := (select auth.uid());
  requested_count integer;
  matched_count integer;
  usd_cny_rate numeric;
  normalized_usd_price numeric;
  provenance jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if target_lead_ids is null or cardinality(target_lead_ids) = 0 then
    raise exception 'At least one lead is required';
  end if;

  select count(distinct requested_id) into requested_count
  from unnest(target_lead_ids) as requested_id;

  select count(*) into matched_count
  from public.wpi_price_collection_leads
  where id = any(target_lead_ids);

  if matched_count <> requested_count then
    raise exception 'One or more collection leads were not found';
  end if;

  for current_lead in
    select *
    from public.wpi_price_collection_leads
    where id = any(target_lead_ids)
    order by created_at, id
    for update
  loop
    if not private.wpi_has_permission(current_lead.organization_id, 'price.review') then
      raise exception 'Price review permission is required';
    end if;
    if current_lead.status = 'transferred' then
      return next current_lead;
      continue;
    end if;
    if current_lead.status <> 'ready' then
      raise exception 'All leads must be confirmed before transfer';
    end if;

    select rate into usd_cny_rate
    from public.wpi_currency_rates
    where organization_id = current_lead.organization_id
      and upper(base_currency) = 'USD'
      and upper(quote_currency) = 'CNY'
      and effective_at <= coalesce(
        current_lead.source_checked_at,
        current_lead.quote_date::timestamptz + interval '1 day',
        current_lead.created_at,
        now()
      )
    order by effective_at desc
    limit 1;

    normalized_usd_price := case
      when upper(current_lead.currency) = 'USD' then current_lead.price
      when coalesce(current_lead.normalized_price_cny, 0) > 0
        and coalesce(usd_cny_rate, 0) > 0
        then round(current_lead.normalized_price_cny / usd_cny_rate, 2)
      else null
    end;

    provenance := jsonb_strip_nulls(jsonb_build_object(
      'collectionLeadId', current_lead.id,
      'collectionLeadCode', current_lead.lead_code,
      'collectionTaskId', current_lead.task_id,
      'collectionRunId', current_lead.run_id,
      'sourceId', current_lead.source_id,
      'quoteDocumentId', current_lead.quote_document_id,
      'evidenceCode', current_lead.evidence_code,
      'evidenceIds', (
        select coalesce(jsonb_agg(evidence.id order by evidence.fetched_at, evidence.id), '[]'::jsonb)
        from public.wpi_price_collection_evidence evidence
        where evidence.lead_id = current_lead.id
      ),
      'supplierName', current_lead.supplier_name,
      'originalSourceType', current_lead.source_type,
      'sourceCheckedAt', current_lead.source_checked_at,
      'collectedAt', current_lead.created_at,
      'quoteDate', current_lead.quote_date,
      'pricePeriodGranularity', current_lead.price_period_granularity,
      'originalPrice', current_lead.price,
      'originalCurrency', current_lead.currency,
      'normalizedPriceCny', current_lead.normalized_price_cny,
      'exchangeRate', current_lead.exchange_rate,
      'fxStatus', current_lead.fx_status,
      'fxRateDate', current_lead.fx_rate_date,
      'fxSource', current_lead.fx_source,
      'usdPrice', normalized_usd_price,
      'normalizedUsdPrice', normalized_usd_price
    ));

    if current_lead.target_type = 'equipment' then
      if not exists (
        select 1 from public.wpi_equipment_prices
        where organization_id = current_lead.organization_id
          and metadata ->> 'collectionLeadId' = current_lead.id::text
      ) then
        insert into public.wpi_equipment_prices (
          organization_id, price_code, equipment_name, model, category,
          original_price, original_currency, usd_price, price_term,
          source_type, source_url, confidence, risk_level, review_status,
          technical_parameters, metadata, created_by, updated_by
        ) values (
          current_lead.organization_id,
          'EQP-COL-' || current_lead.lead_code,
          current_lead.name,
          nullif(current_lead.specification, ''),
          nullif(current_lead.match_target, ''),
          current_lead.price,
          current_lead.currency,
          normalized_usd_price,
          null,
          'ai_price_collection',
          nullif(current_lead.source_url, ''),
          current_lead.confidence,
          current_lead.risk_level,
          'approved',
          jsonb_strip_nulls(jsonb_build_object(
            'specification', current_lead.specification,
            'unit', current_lead.original_unit,
            'region', current_lead.region
          )),
          provenance,
          current_user_id,
          current_user_id
        );
      end if;
    elsif current_lead.target_type = 'material' then
      if not exists (
        select 1 from public.wpi_material_prices
        where organization_id = current_lead.organization_id
          and metadata ->> 'collectionLeadId' = current_lead.id::text
      ) then
        insert into public.wpi_material_prices (
          organization_id, price_code, material_name, specification, category,
          unit, price, currency, region, source_type, source_url, confidence,
          risk_level, review_status, metadata, created_by, updated_by
        ) values (
          current_lead.organization_id,
          'MAT-COL-' || current_lead.lead_code,
          current_lead.name,
          nullif(current_lead.specification, ''),
          nullif(current_lead.match_target, ''),
          coalesce(nullif(current_lead.original_unit, ''), '项'),
          current_lead.price,
          current_lead.currency,
          nullif(current_lead.region, ''),
          'ai_price_collection',
          nullif(current_lead.source_url, ''),
          current_lead.confidence,
          current_lead.risk_level,
          'approved',
          provenance,
          current_user_id,
          current_user_id
        );
      end if;
    else
      raise exception 'Unsupported collection lead target type';
    end if;

    update public.wpi_price_collection_leads
    set status = 'transferred', transferred_at = now(), updated_by = current_user_id
    where id = current_lead.id
    returning * into current_lead;

    return next current_lead;
  end loop;
end;
$$;

revoke all on function private.wpi_transfer_price_collection_leads_impl(uuid[])
  from public, anon, authenticated;
grant execute on function private.wpi_transfer_price_collection_leads_impl(uuid[])
  to authenticated;

update public.wpi_equipment_prices as target
set
  usd_price = coalesce(
    target.usd_price,
    case
      when upper(lead.currency) = 'USD' then lead.price
      when coalesce(lead.normalized_price_cny, 0) > 0 and coalesce(usd_rate.rate, 0) > 0
        then round(lead.normalized_price_cny / usd_rate.rate, 2)
      else null
    end
  ),
  metadata = coalesce(target.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'quoteDate', lead.quote_date,
    'pricePeriodGranularity', lead.price_period_granularity,
    'originalPrice', lead.price,
    'originalCurrency', lead.currency,
    'normalizedPriceCny', lead.normalized_price_cny,
    'exchangeRate', lead.exchange_rate,
    'fxStatus', lead.fx_status,
    'fxRateDate', lead.fx_rate_date,
    'fxSource', lead.fx_source,
    'sourceCheckedAt', lead.source_checked_at,
    'usdPrice', case
      when upper(lead.currency) = 'USD' then lead.price
      when coalesce(lead.normalized_price_cny, 0) > 0 and coalesce(usd_rate.rate, 0) > 0
        then round(lead.normalized_price_cny / usd_rate.rate, 2)
      else null
    end,
    'evidenceIds', (
      select coalesce(jsonb_agg(evidence.id order by evidence.fetched_at, evidence.id), '[]'::jsonb)
      from public.wpi_price_collection_evidence evidence
      where evidence.lead_id = lead.id
    )
  ))
from public.wpi_price_collection_leads lead
left join lateral (
  select rate
  from public.wpi_currency_rates
  where organization_id = lead.organization_id
    and upper(base_currency) = 'USD'
    and upper(quote_currency) = 'CNY'
    and effective_at <= coalesce(lead.source_checked_at, lead.quote_date::timestamptz + interval '1 day', lead.created_at, now())
  order by effective_at desc
  limit 1
) usd_rate on true
where target.organization_id = lead.organization_id
  and target.metadata ->> 'collectionLeadId' = lead.id::text;

update public.wpi_material_prices as target
set metadata = coalesce(target.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'quoteDate', lead.quote_date,
  'pricePeriodGranularity', lead.price_period_granularity,
  'originalPrice', lead.price,
  'originalCurrency', lead.currency,
  'normalizedPriceCny', lead.normalized_price_cny,
  'exchangeRate', lead.exchange_rate,
  'fxStatus', lead.fx_status,
  'fxRateDate', lead.fx_rate_date,
  'fxSource', lead.fx_source,
  'sourceCheckedAt', lead.source_checked_at,
  'usdPrice', case
    when upper(lead.currency) = 'USD' then lead.price
    when coalesce(lead.normalized_price_cny, 0) > 0 and coalesce(usd_rate.rate, 0) > 0
      then round(lead.normalized_price_cny / usd_rate.rate, 2)
    else null
  end,
  'normalizedUsdPrice', case
    when upper(lead.currency) = 'USD' then lead.price
    when coalesce(lead.normalized_price_cny, 0) > 0 and coalesce(usd_rate.rate, 0) > 0
      then round(lead.normalized_price_cny / usd_rate.rate, 2)
    else null
  end,
  'evidenceIds', (
    select coalesce(jsonb_agg(evidence.id order by evidence.fetched_at, evidence.id), '[]'::jsonb)
    from public.wpi_price_collection_evidence evidence
    where evidence.lead_id = lead.id
  )
))
from public.wpi_price_collection_leads lead
left join lateral (
  select rate
  from public.wpi_currency_rates
  where organization_id = lead.organization_id
    and upper(base_currency) = 'USD'
    and upper(quote_currency) = 'CNY'
    and effective_at <= coalesce(lead.source_checked_at, lead.quote_date::timestamptz + interval '1 day', lead.created_at, now())
  order by effective_at desc
  limit 1
) usd_rate on true
where target.organization_id = lead.organization_id
  and target.metadata ->> 'collectionLeadId' = lead.id::text;

comment on function private.wpi_transfer_price_collection_leads_impl(uuid[]) is
  'Atomically transfers reviewed collection leads while preserving quote period, FX normalization, and evidence lineage.';


