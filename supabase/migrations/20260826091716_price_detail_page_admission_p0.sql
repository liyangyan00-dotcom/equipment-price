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
  if nullif(new.region, '') is null then reasons := array_append(reasons, 'missing_region'); end if;
  if new.collection_mode = 'web' and nullif(new.price_context_excerpt, '') is null then
    reasons := array_append(reasons, 'missing_price_context');
  end if;
  if new.collection_mode = 'web'
    and coalesce(candidate ->> 'pageKind', '') <> 'product_detail' then
    reasons := array_append(reasons, 'non_product_detail_page');
  end if;

  reasons := array(select distinct reason from unnest(reasons) reason where reason <> '');
  if extraction_invalid or reasons && array[
    'shipping_threshold_not_product_price',
    'missing_keyword_near_price',
    'non_product_number',
    'contact_number',
    'minimum_order_amount',
    'non_product_detail_page'
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

update public.wpi_price_collection_leads
set metadata = metadata
where collection_mode = 'web';

comment on function private.wpi_refresh_price_lead_validity() is
  'Enforces detail-page evidence plus product name, specification, unit, currency, region, and original price context before a web price becomes valid.';

;
