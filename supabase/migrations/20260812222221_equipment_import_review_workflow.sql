alter table public.wpi_equipment_import_batches
  add column submitted_rows integer not null default 0 check (submitted_rows >= 0),
  add column imported_rows integer not null default 0 check (imported_rows >= 0),
  add column rejected_rows integer not null default 0 check (rejected_rows >= 0),
  add column skipped_rows integer not null default 0 check (skipped_rows >= 0);

alter table public.wpi_equipment_import_rows
  add column equipment_price_id uuid references public.wpi_equipment_prices(id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_comment text;

create index wpi_equipment_import_rows_price_idx
  on public.wpi_equipment_import_rows(equipment_price_id)
  where equipment_price_id is not null;

create trigger wpi_equipment_import_rows_audit
after insert or update or delete on public.wpi_equipment_import_rows
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_equipment_price_reviews
  alter column equipment_price_id drop not null,
  add column source_kind text not null default 'price'
    check (source_kind in ('price', 'import')),
  add column import_row_id uuid references public.wpi_equipment_import_rows(id) on delete cascade;

alter table public.wpi_equipment_price_reviews
  drop constraint wpi_equipment_price_reviews_organization_id_equipment_price_key;

alter table public.wpi_equipment_price_reviews
  add constraint wpi_equipment_price_reviews_source_check
  check (
    (source_kind = 'price' and equipment_price_id is not null and import_row_id is null)
    or
    (source_kind = 'import' and import_row_id is not null)
  );

create unique index wpi_equipment_price_reviews_price_unique_idx
  on public.wpi_equipment_price_reviews(organization_id, equipment_price_id)
  where source_kind = 'price' and equipment_price_id is not null;

create unique index wpi_equipment_price_reviews_import_unique_idx
  on public.wpi_equipment_price_reviews(organization_id, import_row_id)
  where source_kind = 'import' and import_row_id is not null;

create index wpi_equipment_price_reviews_import_row_idx
  on public.wpi_equipment_price_reviews(import_row_id)
  where import_row_id is not null;

create or replace function private.wpi_refresh_equipment_import_batch(target_batch_id uuid)
returns public.wpi_equipment_import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_row public.wpi_equipment_import_batches;
  row_total integer;
  row_valid integer;
  row_warning integer;
  row_error integer;
  row_duplicate integer;
  row_selected integer;
  review_total integer;
  review_active integer;
  review_approved integer;
  review_rejected integer;
  row_skipped integer;
begin
  select * into batch_row
  from public.wpi_equipment_import_batches
  where id = target_batch_id
  for update;

  if batch_row.id is null then
    raise exception 'Import batch not found';
  end if;

  select
    count(*),
    count(*) filter (where validation_status = 'valid'),
    count(*) filter (where validation_status = 'warning'),
    count(*) filter (where validation_status = 'error'),
    count(*) filter (where validation_status = 'duplicate'),
    count(*) filter (where is_selected),
    count(*) filter (
      where validation_status = 'ignored'
        and not exists (
          select 1
          from public.wpi_equipment_price_reviews review
          where review.import_row_id = public.wpi_equipment_import_rows.id
        )
    )
  into
    row_total,
    row_valid,
    row_warning,
    row_error,
    row_duplicate,
    row_selected,
    row_skipped
  from public.wpi_equipment_import_rows
  where batch_id = target_batch_id;

  select
    count(*),
    count(*) filter (where review.status in ('pending', 'in_review', 'need_info')),
    count(*) filter (where review.status = 'approved'),
    count(*) filter (where review.status = 'rejected')
  into review_total, review_active, review_approved, review_rejected
  from public.wpi_equipment_price_reviews review
  join public.wpi_equipment_import_rows import_row
    on import_row.id = review.import_row_id
  where import_row.batch_id = target_batch_id
    and review.source_kind = 'import';

  update public.wpi_equipment_import_batches
  set
    total_rows = coalesce(row_total, 0),
    valid_rows = coalesce(row_valid, 0),
    warning_rows = coalesce(row_warning, 0),
    error_rows = coalesce(row_error, 0),
    duplicate_rows = coalesce(row_duplicate, 0),
    selected_rows = coalesce(row_selected, 0),
    submitted_rows = coalesce(review_total, 0),
    imported_rows = coalesce(review_approved, 0),
    rejected_rows = coalesce(review_rejected, 0),
    skipped_rows = coalesce(row_skipped, 0),
    needs_review_rows = coalesce(review_active, 0),
    status = case
      when status in ('cancelled', 'failed') then status
      when coalesce(review_total, 0) > 0 and coalesce(review_active, 0) = 0 then 'completed'
      when coalesce(review_total, 0) > 0 then 'needs_review'
      else status
    end,
    current_step = case when coalesce(review_total, 0) > 0 then 4 else current_step end,
    completed_at = case
      when coalesce(review_total, 0) > 0 and coalesce(review_active, 0) = 0 then coalesce(completed_at, now())
      else null
    end,
    source_metadata = jsonb_set(
      jsonb_set(
        coalesce(source_metadata, '{}'::jsonb),
        '{review_outcome}',
        jsonb_build_object(
          'submitted', coalesce(review_total, 0),
          'pending', coalesce(review_active, 0),
          'imported', coalesce(review_approved, 0),
          'rejected', coalesce(review_rejected, 0),
          'skipped', coalesce(row_skipped, 0)
        ),
        true
      ),
      '{review_outcome_updated_at}',
      to_jsonb(now()),
      true
    )
  where id = target_batch_id
  returning * into batch_row;

  return batch_row;
end;
$$;

revoke all on function private.wpi_refresh_equipment_import_batch(uuid) from public, anon, authenticated;

create or replace function public.wpi_submit_equipment_import_batch(target_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_row public.wpi_equipment_import_batches;
  blocking_count integer;
  selected_count integer;
  submitted_count integer;
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

  if batch_row.status in ('cancelled', 'failed', 'completed') then
    return jsonb_build_object(
      'ok', false,
      'code', 'BATCH_NOT_EDITABLE',
      'message', '当前批次状态不可再次提交审核'
    );
  end if;

  update public.wpi_equipment_import_rows import_row
  set
    validation_status = 'duplicate',
    issues = case
      when issues @> '["正式价格库已存在同设备、型号、供应商和价格记录"]'::jsonb then issues
      else issues || '["正式价格库已存在同设备、型号、供应商和价格记录"]'::jsonb
    end,
    is_selected = false
  where import_row.batch_id = target_batch_id
    and import_row.is_selected
    and import_row.validation_status in ('valid', 'warning')
    and exists (
      select 1
      from public.wpi_equipment_prices price
      left join public.wpi_suppliers supplier on supplier.id = price.supplier_id
      where price.organization_id = import_row.organization_id
        and price.deleted_at is null
        and lower(btrim(price.equipment_name)) = lower(btrim(import_row.normalized_data ->> 'equipment_name'))
        and lower(btrim(coalesce(price.model, ''))) = lower(btrim(coalesce(import_row.normalized_data ->> 'model', '')))
        and lower(btrim(coalesce(supplier.name, ''))) = lower(btrim(coalesce(import_row.normalized_data ->> 'supplier_name', '')))
        and price.original_price = nullif(import_row.normalized_data ->> 'original_price', '')::numeric
        and upper(price.original_currency) = upper(coalesce(import_row.normalized_data ->> 'original_currency', ''))
    );

  select count(*) into selected_count
  from public.wpi_equipment_import_rows
  where batch_id = target_batch_id
    and is_selected;

  if selected_count = 0 then
    perform private.wpi_refresh_equipment_import_batch(target_batch_id);
    return jsonb_build_object(
      'ok', false,
      'code', 'NO_SELECTED_ROWS',
      'message', '没有可提交审核的有效记录'
    );
  end if;

  select count(*) into blocking_count
  from public.wpi_equipment_import_rows
  where batch_id = target_batch_id
    and is_selected
    and validation_status not in ('valid', 'warning');

  if blocking_count > 0 then
    perform private.wpi_refresh_equipment_import_batch(target_batch_id);
    return jsonb_build_object(
      'ok', false,
      'code', 'BLOCKING_ROWS',
      'message', format('仍有 %s 条阻断记录，请先修正或忽略', blocking_count),
      'blockingCount', blocking_count
    );
  end if;

  insert into public.wpi_equipment_price_reviews (
    organization_id,
    equipment_price_id,
    source_kind,
    import_row_id,
    status,
    confidence,
    completeness,
    risk_level,
    matched_rules,
    missing_fields,
    evidence_checks,
    ai_judgment,
    ai_recommendation,
    submitted_by,
    submitted_at
  )
  select
    import_row.organization_id,
    null,
    'import',
    import_row.id,
    'pending'::public.wpi_price_review_task_status,
    coalesce(import_row.confidence, 60),
    greatest(35, least(98, coalesce(import_row.confidence, 60) - jsonb_array_length(coalesce(import_row.issues, '[]'::jsonb)) * 6)),
    case
      when import_row.confidence < 60 then 'high'::public.wpi_risk_level
      when import_row.validation_status = 'warning' or import_row.confidence < 80 then 'medium'::public.wpi_risk_level
      else 'low'::public.wpi_risk_level
    end,
    array(
      select jsonb_array_elements_text(coalesce(import_row.issues, '[]'::jsonb))
    ),
    array_remove(array[
      case when coalesce(import_row.normalized_data ->> 'equipment_name', '') = '' then '设备名称' end,
      case when coalesce(import_row.normalized_data ->> 'model', '') = '' then '规格型号' end,
      case when coalesce(import_row.normalized_data ->> 'supplier_name', '') = '' then '供应商' end,
      case when coalesce(import_row.normalized_data ->> 'quote_date', '') = '' then '报价日期' end
    ], null),
    jsonb_build_object(
      'price_source', true,
      'supplier', coalesce(import_row.normalized_data ->> 'supplier_name', '') <> '',
      'technical_parameters', coalesce(import_row.normalized_data ->> 'model', '') <> '',
      'validity', coalesce(import_row.normalized_data ->> 'quote_date', '') ~ '^\\d{4}-\\d{2}-\\d{2}$',
      '_states', jsonb_build_object(
        'price_source', 'verified',
        'supplier', case when coalesce(import_row.normalized_data ->> 'supplier_name', '') <> '' then 'verified' else 'missing' end,
        'technical_parameters', case when coalesce(import_row.normalized_data ->> 'model', '') <> '' then 'verified' else 'missing' end,
        'validity', case when coalesce(import_row.normalized_data ->> 'quote_date', '') ~ '^\\d{4}-\\d{2}-\\d{2}$' then 'verified' else 'missing' end
      )
    ),
    case
      when import_row.validation_status = 'warning' then 'Excel 解析记录存在需人工确认的字段，禁止直接进入正式价格库。'
      else '字段映射与基础校验已完成，仍需人工核验证据链后方可入库。'
    end,
    '核对原始报价文件、供应商主体、规格参数与有效期后再提交审核结论。',
    auth.uid(),
    now()
  from public.wpi_equipment_import_rows import_row
  where import_row.batch_id = target_batch_id
    and import_row.is_selected
    and import_row.validation_status in ('valid', 'warning')
  on conflict (organization_id, import_row_id)
    where source_kind = 'import' and import_row_id is not null
  do update set
    status = 'pending',
    confidence = excluded.confidence,
    completeness = excluded.completeness,
    risk_level = excluded.risk_level,
    matched_rules = excluded.matched_rules,
    missing_fields = excluded.missing_fields,
    evidence_checks = excluded.evidence_checks,
    ai_judgment = excluded.ai_judgment,
    ai_recommendation = excluded.ai_recommendation,
    assigned_to = null,
    reviewed_by = null,
    review_comment = null,
    reviewed_at = null,
    submitted_by = auth.uid(),
    submitted_at = now();

  get diagnostics submitted_count = row_count;

  update public.wpi_equipment_import_rows
  set validation_status = 'submitted'
  where batch_id = target_batch_id
    and is_selected
    and validation_status in ('valid', 'warning');

  update public.wpi_equipment_import_batches
  set
    status = 'needs_review',
    current_step = 4,
    submitted_at = now(),
    completed_at = null
  where id = target_batch_id;

  select * into batch_row
  from private.wpi_refresh_equipment_import_batch(target_batch_id);

  return jsonb_build_object(
    'ok', true,
    'submittedCount', submitted_count,
    'batch', to_jsonb(batch_row)
  );
end;
$$;

revoke all on function public.wpi_submit_equipment_import_batch(uuid) from public, anon;
grant execute on function public.wpi_submit_equipment_import_batch(uuid) to authenticated;

create or replace function public.wpi_review_equipment_price(
  review_id uuid,
  decision text,
  comment text default null
)
returns public.wpi_equipment_price_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_row public.wpi_equipment_price_reviews;
  import_row public.wpi_equipment_import_rows;
  import_batch public.wpi_equipment_import_batches;
  supplier_id uuid;
  created_price_id uuid;
  generated_price_code text;
  valid_until_date date;
  next_task_status public.wpi_price_review_task_status;
  next_price_status public.wpi_review_status;
begin
  select * into review_row
  from public.wpi_equipment_price_reviews
  where id = review_id
  for update;

  if review_row.id is null then
    raise exception 'Review task not found';
  end if;

  if not private.wpi_has_permission(review_row.organization_id, 'price.review') then
    raise exception 'Insufficient review permission';
  end if;

  case decision
    when 'start' then
      next_task_status := 'in_review';
      next_price_status := 'pending_review';
    when 'approve' then
      next_task_status := 'approved';
      next_price_status := 'approved';
    when 'reject' then
      next_task_status := 'rejected';
      next_price_status := 'rejected';
    when 'need_info' then
      next_task_status := 'need_info';
      next_price_status := 'pending_review';
    else
      raise exception 'Unsupported review decision: %', decision;
  end case;

  if decision in ('reject', 'need_info') and nullif(btrim(comment), '') is null then
    raise exception 'A review comment is required for this decision';
  end if;

  if review_row.source_kind = 'import' then
    select * into import_row
    from public.wpi_equipment_import_rows
    where id = review_row.import_row_id
      and organization_id = review_row.organization_id
    for update;

    if import_row.id is null then
      raise exception 'Import row not found';
    end if;

    select * into import_batch
    from public.wpi_equipment_import_batches
    where id = import_row.batch_id
    for update;

    if decision = 'approve' then
      if coalesce(import_row.normalized_data ->> 'equipment_name', '') = ''
        or coalesce(import_row.normalized_data ->> 'original_price', '') = ''
        or (import_row.normalized_data ->> 'original_price')::numeric <= 0 then
        raise exception 'Import row is missing required price fields';
      end if;

      select supplier.id into supplier_id
      from public.wpi_suppliers supplier
      where supplier.organization_id = review_row.organization_id
        and lower(btrim(supplier.name)) = lower(btrim(coalesce(import_row.normalized_data ->> 'supplier_name', '')))
      order by supplier.updated_at desc
      limit 1;

      if coalesce(import_row.normalized_data ->> 'quote_date', '') ~ '^\\d{4}-\\d{2}-\\d{2}$' then
        valid_until_date := (import_row.normalized_data ->> 'quote_date')::date + 90;
      end if;

      generated_price_code := format(
        'EQP-IMP-%s-%s',
        to_char(now(), 'YYYYMMDD'),
        upper(substr(replace(import_row.id::text, '-', ''), 1, 10))
      );

      insert into public.wpi_equipment_prices (
        organization_id,
        price_code,
        equipment_name,
        brand,
        model,
        category,
        original_price,
        original_currency,
        usd_price,
        price_term,
        supplier_id,
        source_type,
        source_url,
        valid_until,
        confidence,
        risk_level,
        review_status,
        technical_parameters,
        metadata,
        created_by,
        updated_by
      ) values (
        review_row.organization_id,
        generated_price_code,
        import_row.normalized_data ->> 'equipment_name',
        nullif(import_row.normalized_data ->> 'brand', ''),
        nullif(import_row.normalized_data ->> 'model', ''),
        nullif(import_row.normalized_data ->> 'category', ''),
        (import_row.normalized_data ->> 'original_price')::numeric,
        upper(coalesce(nullif(import_row.normalized_data ->> 'original_currency', ''), 'CNY')),
        case
          when upper(coalesce(import_row.normalized_data ->> 'original_currency', '')) = 'USD'
          then (import_row.normalized_data ->> 'original_price')::numeric
          else null
        end,
        nullif(import_row.normalized_data ->> 'price_term', ''),
        supplier_id,
        'Excel导入',
        case
          when import_batch.storage_bucket is not null and import_batch.storage_path is not null
          then format('storage://%s/%s', import_batch.storage_bucket, import_batch.storage_path)
          else null
        end,
        valid_until_date,
        import_row.confidence,
        review_row.risk_level,
        'approved',
        jsonb_build_object(
          'specification', import_row.normalized_data ->> 'model',
          'importBatchCode', import_batch.batch_code,
          'importRowNumber', import_row.row_number
        ),
        jsonb_build_object(
          'origin', 'equipment_import',
          'importBatchId', import_batch.id,
          'importBatchCode', import_batch.batch_code,
          'importRowId', import_row.id,
          'quoteDate', import_row.normalized_data ->> 'quote_date'
        ),
        auth.uid(),
        auth.uid()
      )
      returning id into created_price_id;

      update public.wpi_equipment_import_rows
      set
        validation_status = 'imported',
        equipment_price_id = created_price_id,
        reviewed_at = now(),
        review_comment = nullif(btrim(comment), '')
      where id = import_row.id;

      update public.wpi_equipment_price_reviews
      set equipment_price_id = created_price_id
      where id = review_row.id;
    elsif decision = 'reject' then
      update public.wpi_equipment_import_rows
      set
        validation_status = 'ignored',
        is_selected = false,
        reviewed_at = now(),
        review_comment = nullif(btrim(comment), ''),
        issues = issues || jsonb_build_array('审核驳回：' || btrim(comment))
      where id = import_row.id;
    elsif decision = 'need_info' then
      update public.wpi_equipment_import_rows
      set
        validation_status = 'warning',
        reviewed_at = now(),
        review_comment = nullif(btrim(comment), ''),
        issues = issues || jsonb_build_array('待补充资料：' || btrim(comment))
      where id = import_row.id;
    else
      update public.wpi_equipment_import_rows
      set validation_status = 'submitted'
      where id = import_row.id;
    end if;
  end if;

  update public.wpi_equipment_price_reviews
  set
    status = next_task_status,
    assigned_to = coalesce(assigned_to, auth.uid()),
    reviewed_by = case when decision = 'start' then reviewed_by else auth.uid() end,
    review_comment = case
      when decision = 'start' then review_comment
      else nullif(btrim(comment), '')
    end,
    reviewed_at = case when decision = 'start' then reviewed_at else now() end
  where id = review_id
  returning * into review_row;

  if review_row.source_kind = 'price' then
    update public.wpi_equipment_prices
    set
      review_status = next_price_status,
      updated_by = auth.uid()
    where id = review_row.equipment_price_id
      and organization_id = review_row.organization_id;
  else
    perform private.wpi_refresh_equipment_import_batch(import_row.batch_id);
  end if;

  return review_row;
end;
$$;

revoke all on function public.wpi_review_equipment_price(uuid, text, text) from public, anon;
grant execute on function public.wpi_review_equipment_price(uuid, text, text) to authenticated;
;
