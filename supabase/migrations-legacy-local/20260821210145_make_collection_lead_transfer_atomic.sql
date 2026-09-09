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
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if target_lead_ids is null or cardinality(target_lead_ids) = 0 then
    raise exception 'At least one lead is required';
  end if;

  select count(distinct requested_id)
    into requested_count
  from unnest(target_lead_ids) as requested_id;

  select count(*)
    into matched_count
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

    if current_lead.target_type = 'equipment' then
      if not exists (
        select 1
        from public.wpi_equipment_prices
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
          case when upper(current_lead.currency) = 'USD' then current_lead.price else null end,
          null,
          'ai_price_collection',
          nullif(current_lead.source_url, ''),
          current_lead.confidence,
          current_lead.risk_level,
          'approved',
          jsonb_build_object(
            'specification', current_lead.specification,
            'unit', current_lead.original_unit,
            'region', current_lead.region
          ),
          jsonb_build_object(
            'collectionLeadId', current_lead.id,
            'collectionLeadCode', current_lead.lead_code,
            'collectionTaskId', current_lead.task_id,
            'collectionRunId', current_lead.run_id,
            'sourceId', current_lead.source_id,
            'quoteDocumentId', current_lead.quote_document_id,
            'evidenceCode', current_lead.evidence_code,
            'supplierName', current_lead.supplier_name,
            'originalSourceType', current_lead.source_type
          ),
          current_user_id,
          current_user_id
        );
      end if;
    elsif current_lead.target_type = 'material' then
      if not exists (
        select 1
        from public.wpi_material_prices
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
          jsonb_build_object(
            'collectionLeadId', current_lead.id,
            'collectionLeadCode', current_lead.lead_code,
            'collectionTaskId', current_lead.task_id,
            'collectionRunId', current_lead.run_id,
            'sourceId', current_lead.source_id,
            'quoteDocumentId', current_lead.quote_document_id,
            'evidenceCode', current_lead.evidence_code,
            'supplierName', current_lead.supplier_name,
            'originalSourceType', current_lead.source_type
          ),
          current_user_id,
          current_user_id
        );
      end if;
    else
      raise exception 'Unsupported collection lead target type';
    end if;

    update public.wpi_price_collection_leads
    set status = 'transferred',
        transferred_at = now(),
        updated_by = current_user_id
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

create or replace function public.wpi_transfer_price_collection_leads(
  target_lead_ids uuid[]
)
returns setof public.wpi_price_collection_leads
language sql
security invoker
set search_path = ''
as $$
  select * from private.wpi_transfer_price_collection_leads_impl(target_lead_ids);
$$;

revoke all on function public.wpi_transfer_price_collection_leads(uuid[])
  from public, anon;
grant execute on function public.wpi_transfer_price_collection_leads(uuid[])
  to authenticated;

comment on function public.wpi_transfer_price_collection_leads(uuid[]) is
  'Atomically transfers reviewed collection leads into the equipment or material price library and preserves source lineage.';
