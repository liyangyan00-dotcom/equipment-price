create or replace function public.wpi_confirm_project_pricing_item(
  p_item_id uuid,
  p_unit_price numeric,
  p_currency text,
  p_normalized_usd_price numeric,
  p_notes text,
  p_source_type text default null,
  p_source_record_id uuid default null,
  p_supplier_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select organization_id into v_organization_id
  from public.wpi_project_pricing_items
  where id = p_item_id;

  if v_organization_id is null then
    raise exception 'Project pricing item not found';
  end if;
  if not private.wpi_has_permission(v_organization_id, 'price.review')
     and not private.wpi_has_permission(v_organization_id, 'project.write') then
    raise exception 'Permission denied';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'Invalid unit price';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency';
  end if;
  if v_currency <> 'USD' and (p_normalized_usd_price is null or p_normalized_usd_price < 0) then
    raise exception 'USD normalized price is required';
  end if;
  if p_source_type is not null and p_source_type not in (
    'equipment_price', 'material_price', 'inquiry_quote', 'ai_estimate', 'manual', 'unmatched'
  ) then
    raise exception 'Unsupported price source';
  end if;

  update public.wpi_project_pricing_items
  set matched_unit_price = p_unit_price,
      currency = v_currency,
      normalized_usd_price = case when v_currency = 'USD' then p_unit_price else p_normalized_usd_price end,
      price_source_type = coalesce(nullif(p_source_type, ''), price_source_type),
      source_record_id = case when p_source_type = 'manual' then null else coalesce(p_source_record_id, source_record_id) end,
      supplier_id = coalesce(p_supplier_id, supplier_id),
      confidence = 100,
      match_level = case when match_level = 'unmatched' then 'similar' else match_level end,
      risk_level = 'low',
      needs_inquiry = false,
      decision_status = 'confirmed',
      notes = left(coalesce(nullif(btrim(p_notes), ''), '人工确认价格'), 2000),
      metadata = metadata || jsonb_build_object(
        'confirmedBy', (select auth.uid()),
        'confirmedAt', now(),
        'requiresManualPricingConfirmation', false
      ),
      updated_by = (select auth.uid())
  where id = p_item_id;

  return p_item_id;
end;
$$;

revoke all on function public.wpi_confirm_project_pricing_item(uuid, numeric, text, numeric, text, text, uuid, uuid)
  from public, anon;
grant execute on function public.wpi_confirm_project_pricing_item(uuid, numeric, text, numeric, text, text, uuid, uuid)
  to authenticated, service_role;;
