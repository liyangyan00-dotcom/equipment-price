drop function if exists public.wpi_confirm_project_pricing_item(uuid, uuid, numeric, text, numeric, text, text, uuid, uuid);
drop function if exists public.wpi_confirm_project_pricing_item(uuid, uuid, numeric, text, numeric, text, text, uuid, uuid, text, text);
drop function if exists public.wpi_confirm_project_pricing_item(uuid, uuid, numeric, text, numeric, text, text, uuid, uuid, text, text, jsonb);

create function public.wpi_confirm_project_pricing_item(
  p_item_id uuid,
  p_project_id uuid,
  p_unit_price numeric,
  p_currency text,
  p_normalized_usd_price numeric,
  p_notes text,
  p_source_type text default null,
  p_source_record_id uuid default null,
  p_supplier_id uuid default null,
  p_confirmation_reason text default 'commercial_adjustment',
  p_price_basis text default 'manual_adjustment',
  p_decision_context jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.wpi_project_pricing_items%rowtype;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
  v_normalized_usd_price numeric;
  v_difference_pct numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select * into v_item
  from public.wpi_project_pricing_items
  where id = p_item_id
    and project_id = p_project_id;

  if v_item.id is null then
    raise exception 'Project pricing item not found';
  end if;
  if not private.wpi_has_permission(v_item.organization_id, 'price.review')
     and not private.wpi_has_permission(v_item.organization_id, 'project.write') then
    raise exception 'Permission denied';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then
    raise exception 'Invalid unit price';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency';
  end if;
  if p_confirmation_reason not in (
    'accept_ai_recommendation',
    'select_alternative',
    'commercial_adjustment',
    'latest_quote',
    'other'
  ) then
    raise exception 'Unsupported confirmation reason';
  end if;
  if p_price_basis not in (
    'ai_recommendation',
    'price_library_candidate',
    'supplier_quote',
    'manual_adjustment'
  ) then
    raise exception 'Unsupported price basis';
  end if;
  if p_decision_context is null or jsonb_typeof(p_decision_context) <> 'object' then
    raise exception 'Invalid decision context';
  end if;
  if p_confirmation_reason = 'other' and nullif(btrim(coalesce(p_notes, '')), '') is null then
    raise exception 'Confirmation notes are required for other reason';
  end if;
  if p_source_type is not null and p_source_type not in (
    'equipment_price', 'material_price', 'inquiry_quote', 'ai_estimate', 'manual', 'unmatched'
  ) then
    raise exception 'Unsupported price source';
  end if;

  v_normalized_usd_price := case
    when v_currency = 'USD' then p_unit_price
    else p_normalized_usd_price
  end;
  if v_normalized_usd_price is null or v_normalized_usd_price <= 0 then
    raise exception 'USD normalized price is required';
  end if;

  v_difference_pct := case
    when coalesce(v_item.normalized_usd_price, 0) > 0
      then round(
        ((v_normalized_usd_price - v_item.normalized_usd_price)
          / v_item.normalized_usd_price) * 100,
        2
      )
    else 0
  end;

  update public.wpi_project_pricing_items
  set matched_unit_price = p_unit_price,
      currency = v_currency,
      normalized_usd_price = v_normalized_usd_price,
      price_source_type = coalesce(nullif(p_source_type, ''), price_source_type),
      source_record_id = case
        when p_source_type = 'manual' then null
        else p_source_record_id
      end,
      supplier_id = p_supplier_id,
      confidence = 100,
      match_level = case when match_level = 'unmatched' then 'similar' else match_level end,
      risk_level = 'low',
      needs_inquiry = false,
      decision_status = 'confirmed',
      notes = left(coalesce(nullif(btrim(p_notes), ''), '人工确认价格'), 2000),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'confirmedBy', (select auth.uid()),
        'confirmedAt', now(),
        'confirmationReason', p_confirmation_reason,
        'priceBasis', p_price_basis,
        'confirmedPreviousUnitPrice', v_item.matched_unit_price,
        'confirmedPreviousNormalizedUsdPrice', v_item.normalized_usd_price,
        'confirmedUnitPrice', p_unit_price,
        'confirmedCurrency', v_currency,
        'confirmedNormalizedUsdPrice', v_normalized_usd_price,
        'confirmationDifferencePct', v_difference_pct,
        'confirmationSubtotalUsd', round(v_normalized_usd_price * v_item.quantity, 2),
        'confirmedSourceCode', nullif(btrim(p_decision_context ->> 'sourceCode'), ''),
        'confirmedSupplierName', nullif(btrim(p_decision_context ->> 'supplierName'), ''),
        'confirmedQuoteDate', nullif(btrim(p_decision_context ->> 'quoteDate'), ''),
        'confirmedValidUntil', nullif(btrim(p_decision_context ->> 'validUntil'), ''),
        'confirmedPriceTerm', nullif(btrim(p_decision_context ->> 'priceTerm'), ''),
        'confirmedRegion', nullif(btrim(p_decision_context ->> 'region'), ''),
        'requiresManualPricingConfirmation', false
      ),
      updated_by = (select auth.uid())
  where id = p_item_id
    and project_id = p_project_id;

  return p_item_id;
end;
$$;

revoke all on function public.wpi_confirm_project_pricing_item(uuid, uuid, numeric, text, numeric, text, text, uuid, uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.wpi_confirm_project_pricing_item(uuid, uuid, numeric, text, numeric, text, text, uuid, uuid, text, text, jsonb)
  to authenticated, service_role;
