create or replace function private.wpi_sync_collection_lead_evidence_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_lead_id uuid;
begin
  affected_lead_id := case
    when tg_op = 'DELETE' then old.lead_id
    else new.lead_id
  end;

  update public.wpi_price_collection_leads lead
  set evidence_code = (
        select evidence.evidence_code
        from public.wpi_price_collection_evidence evidence
        where evidence.lead_id = affected_lead_id
        order by evidence.fetched_at, evidence.id
        limit 1
      ),
      updated_at = now()
  where lead.id = affected_lead_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists wpi_sync_collection_lead_evidence_code
  on public.wpi_price_collection_evidence;
create trigger wpi_sync_collection_lead_evidence_code
after insert or update or delete
on public.wpi_price_collection_evidence
for each row execute function private.wpi_sync_collection_lead_evidence_code();

update public.wpi_price_collection_leads lead
set evidence_code = (
      select item.evidence_code
      from public.wpi_price_collection_evidence item
      where item.lead_id = lead.id
      order by item.fetched_at, item.id
      limit 1
    ),
    updated_at = now()
where exists (
    select 1 from public.wpi_price_collection_evidence item where item.lead_id = lead.id
  )
  and lead.evidence_code is distinct from (
    select item.evidence_code
    from public.wpi_price_collection_evidence item
    where item.lead_id = lead.id
    order by item.fetched_at, item.id
    limit 1
  );

create or replace function private.wpi_normalize_collected_price_admission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_lead_id uuid;
  actual_evidence_code text;
  actual_evidence_ids jsonb;
begin
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  if coalesce(new.metadata ->> 'collectionLeadId', '') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return new;
  end if;

  target_lead_id := (new.metadata ->> 'collectionLeadId')::uuid;
  select evidence.evidence_code into actual_evidence_code
  from public.wpi_price_collection_evidence evidence
  where evidence.lead_id = target_lead_id
  order by evidence.fetched_at, evidence.id
  limit 1;

  select coalesce(jsonb_agg(evidence.id order by evidence.fetched_at, evidence.id), '[]'::jsonb)
  into actual_evidence_ids
  from public.wpi_price_collection_evidence evidence
  where evidence.lead_id = target_lead_id;

  new.metadata := new.metadata || jsonb_strip_nulls(jsonb_build_object(
    'evidenceCode', actual_evidence_code,
    'evidenceIds', actual_evidence_ids
  ));

  if tg_table_name = 'wpi_material_prices'
    and new.specification like '%按根%'
    and coalesce(new.unit, '') <> '根' then
    new.metadata := new.metadata || jsonb_build_object(
      'originalUnit', new.unit,
      'normalizedBusinessUnit', '根'
    );
    new.unit := '根';
  end if;

  return new;
end;
$$;

drop trigger if exists wpi_normalize_collected_material_price
  on public.wpi_material_prices;
create trigger wpi_normalize_collected_material_price
before insert or update of metadata, specification, unit
on public.wpi_material_prices
for each row
when (new.source_type = 'ai_price_collection')
execute function private.wpi_normalize_collected_price_admission();

drop trigger if exists wpi_normalize_collected_equipment_price
  on public.wpi_equipment_prices;
create trigger wpi_normalize_collected_equipment_price
before insert or update of metadata
on public.wpi_equipment_prices
for each row
when (new.source_type = 'ai_price_collection')
execute function private.wpi_normalize_collected_price_admission();

update public.wpi_material_prices price
set metadata = price.metadata,
    specification = price.specification,
    unit = price.unit
where price.source_type = 'ai_price_collection'
  and price.metadata ? 'collectionLeadId';

update public.wpi_equipment_prices price
set metadata = price.metadata
where price.source_type = 'ai_price_collection'
  and price.metadata ? 'collectionLeadId';

create unique index if not exists wpi_material_prices_collection_lead_unique
  on public.wpi_material_prices (organization_id, (metadata ->> 'collectionLeadId'))
  where source_type = 'ai_price_collection' and metadata ? 'collectionLeadId';

create unique index if not exists wpi_equipment_prices_collection_lead_unique
  on public.wpi_equipment_prices (organization_id, (metadata ->> 'collectionLeadId'))
  where source_type = 'ai_price_collection' and metadata ? 'collectionLeadId';

comment on function private.wpi_normalize_collected_price_admission() is
  'Normalizes reviewed business units and derives formal provenance from authoritative evidence rows.';
