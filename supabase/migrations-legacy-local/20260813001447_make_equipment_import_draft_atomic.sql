create or replace function public.wpi_save_equipment_import_draft(
  target_batch_id uuid,
  batch_payload jsonb,
  mapping_payload jsonb default '[]'::jsonb,
  row_payload jsonb default '[]'::jsonb
)
returns public.wpi_equipment_import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_row public.wpi_equipment_import_batches;
  next_status text;
  mapping_item jsonb;
  row_item jsonb;
begin
  select * into batch_row
  from public.wpi_equipment_import_batches
  where id = target_batch_id
  for update;

  if batch_row.id is null then
    raise exception 'Import batch not found';
  end if;
  if not private.wpi_has_permission(batch_row.organization_id, 'price.write') then
    raise exception 'Insufficient import permission';
  end if;
  if batch_row.status not in ('draft', 'uploaded', 'parsing', 'mapping', 'validating', 'failed') then
    raise exception 'Import batch is locked and cannot be overwritten';
  end if;
  if jsonb_typeof(coalesce(mapping_payload, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(row_payload, '[]'::jsonb)) <> 'array' then
    raise exception 'Mappings and rows must be JSON arrays';
  end if;

  next_status := coalesce(nullif(batch_payload ->> 'status', ''), batch_row.status);
  if next_status not in ('draft', 'uploaded', 'mapping', 'validating') then
    raise exception 'Unsupported import draft status: %', next_status;
  end if;

  update public.wpi_equipment_import_batches
  set
    file_name = coalesce(nullif(batch_payload ->> 'fileName', ''), file_name),
    file_size = greatest(0, coalesce(nullif(batch_payload ->> 'fileSize', '')::bigint, file_size)),
    sheet_name = coalesce(nullif(batch_payload ->> 'sheetName', ''), sheet_name),
    header_row = greatest(1, coalesce(nullif(batch_payload ->> 'headerRow', '')::integer, header_row)),
    status = next_status,
    current_step = least(4, greatest(1, coalesce(nullif(batch_payload ->> 'currentStep', '')::integer, current_step))),
    mapping_confidence = least(100, greatest(0, coalesce(nullif(batch_payload ->> 'mappingConfidence', '')::numeric, mapping_confidence, 0))),
    storage_bucket = coalesce(nullif(batch_payload ->> 'storageBucket', ''), storage_bucket),
    storage_path = coalesce(nullif(batch_payload ->> 'storagePath', ''), storage_path),
    mime_type = coalesce(nullif(batch_payload ->> 'mimeType', ''), mime_type),
    file_hash = coalesce(nullif(batch_payload ->> 'fileHash', ''), file_hash),
    parse_engine = coalesce(nullif(batch_payload ->> 'parseEngine', ''), parse_engine),
    workbook_sheets = coalesce(batch_payload -> 'workbookSheets', workbook_sheets, '[]'::jsonb),
    parsed_at = coalesce(nullif(batch_payload ->> 'parsedAt', '')::timestamptz, parsed_at),
    source_metadata = coalesce(source_metadata, '{}'::jsonb)
      || coalesce(batch_payload -> 'sourceMetadata', '{}'::jsonb)
  where id = target_batch_id;

  delete from public.wpi_import_field_mappings
  where batch_id = target_batch_id;

  for mapping_item in
    select value from jsonb_array_elements(coalesce(mapping_payload, '[]'::jsonb))
  loop
    insert into public.wpi_import_field_mappings (
      organization_id,
      batch_id,
      source_field,
      system_field,
      sample_value,
      confidence,
      mapping_status,
      is_required,
      user_modified
    ) values (
      batch_row.organization_id,
      target_batch_id,
      mapping_item ->> 'sourceField',
      nullif(mapping_item ->> 'systemField', ''),
      nullif(mapping_item ->> 'sampleValue', ''),
      least(100, greatest(0, coalesce(nullif(mapping_item ->> 'confidence', '')::numeric, 0))),
      coalesce(nullif(mapping_item ->> 'status', ''), 'unmapped'),
      coalesce((mapping_item ->> 'required')::boolean, false),
      coalesce((mapping_item ->> 'userModified')::boolean, false)
    );
  end loop;

  delete from public.wpi_equipment_import_rows
  where batch_id = target_batch_id;

  for row_item in
    select value from jsonb_array_elements(coalesce(row_payload, '[]'::jsonb))
  loop
    insert into public.wpi_equipment_import_rows (
      organization_id,
      batch_id,
      row_number,
      raw_data,
      normalized_data,
      validation_status,
      confidence,
      issues,
      is_selected
    ) values (
      batch_row.organization_id,
      target_batch_id,
      greatest(1, coalesce(nullif(row_item ->> 'rowNumber', '')::integer, 1)),
      jsonb_build_object(
        '设备名称', coalesce(row_item ->> 'equipmentName', ''),
        '规格型号', coalesce(row_item ->> 'model', ''),
        '品牌', coalesce(row_item ->> 'brand', ''),
        '设备类别', coalesce(row_item ->> 'category', ''),
        '原始价格', coalesce(nullif(row_item ->> 'originalPrice', '')::numeric, 0),
        '币种', coalesce(row_item ->> 'currency', ''),
        '供应商', coalesce(row_item ->> 'supplier', ''),
        '报价日期', coalesce(row_item ->> 'quoteDate', '')
      ),
      jsonb_build_object(
        'equipment_name', coalesce(row_item ->> 'equipmentName', ''),
        'model', coalesce(row_item ->> 'model', ''),
        'brand', coalesce(row_item ->> 'brand', ''),
        'category', coalesce(row_item ->> 'category', ''),
        'original_price', coalesce(nullif(row_item ->> 'originalPrice', '')::numeric, 0),
        'original_currency', coalesce(row_item ->> 'currency', ''),
        'supplier_name', coalesce(row_item ->> 'supplier', ''),
        'quote_date', coalesce(row_item ->> 'quoteDate', '')
      ),
      coalesce(nullif(row_item ->> 'status', ''), 'valid'),
      least(100, greatest(0, coalesce(nullif(row_item ->> 'confidence', '')::numeric, 0))),
      coalesce(row_item -> 'issues', '[]'::jsonb),
      coalesce((row_item ->> 'selected')::boolean, false)
    );
  end loop;

  select * into batch_row
  from private.wpi_refresh_equipment_import_batch(target_batch_id);

  return batch_row;
end;
$$;

revoke all on function public.wpi_save_equipment_import_draft(uuid, jsonb, jsonb, jsonb)
from public, anon;
grant execute on function public.wpi_save_equipment_import_draft(uuid, jsonb, jsonb, jsonb)
to authenticated;
