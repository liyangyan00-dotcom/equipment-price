create table public.wpi_quote_documents (
  id uuid primary key default gen_random_uuid(),
  document_code text not null unique default (
    'QR-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  file_name text not null check (length(btrim(file_name)) between 1 and 300),
  file_size bigint not null default 0 check (file_size between 0 and 52428800),
  mime_type text not null default 'application/octet-stream',
  storage_bucket text not null default 'business-documents',
  storage_path text not null,
  status text not null default 'uploaded' check (
    status in (
      'uploaded', 'parsing', 'needs_review', 'partially_imported',
      'imported', 'voided', 'failed'
    )
  ),
  supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  supplier_name text,
  quote_number text,
  quote_date date,
  valid_until date,
  currency text not null default 'CNY',
  total_amount numeric(18, 2) not null default 0 check (total_amount >= 0),
  overall_confidence numeric(5, 2) check (overall_confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'medium',
  missing_fields text[] not null default '{}',
  ai_task_id uuid references public.wpi_ai_execution_tasks(id) on delete set null,
  recognition_summary jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  error_message text check (error_message is null or length(error_message) <= 4000),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_quote_documents_summary_object check (jsonb_typeof(recognition_summary) = 'object'),
  constraint wpi_quote_documents_metadata_object check (jsonb_typeof(source_metadata) = 'object')
);

create table public.wpi_quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  document_id uuid not null references public.wpi_quote_documents(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  item_type text not null default 'equipment' check (item_type in ('equipment', 'material')),
  item_code text,
  item_name text not null check (length(btrim(item_name)) between 1 and 200),
  brand text,
  specification text,
  category text,
  unit text,
  quantity numeric(18, 4) not null default 1 check (quantity > 0),
  unit_price numeric(18, 2) not null default 0 check (unit_price >= 0),
  total_price numeric(18, 2) not null default 0 check (total_price >= 0),
  currency text not null default 'CNY',
  region text,
  price_condition text,
  supplier_name text,
  confidence numeric(5, 2) not null default 50 check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'medium',
  missing_fields text[] not null default '{}',
  review_status text not null default 'pending_review' check (
    review_status in ('pending_review', 'needs_info', 'approved', 'imported', 'rejected', 'voided')
  ),
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  ai_result jsonb not null default '{}'::jsonb,
  review_note text check (review_note is null or length(review_note) <= 4000),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  target_equipment_price_id uuid references public.wpi_equipment_prices(id) on delete set null,
  target_material_price_id uuid references public.wpi_material_prices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, line_number),
  constraint wpi_quote_items_raw_object check (jsonb_typeof(raw_data) = 'object'),
  constraint wpi_quote_items_normalized_object check (jsonb_typeof(normalized_data) = 'object'),
  constraint wpi_quote_items_ai_object check (jsonb_typeof(ai_result) = 'object'),
  constraint wpi_quote_items_single_target check (
    not (target_equipment_price_id is not null and target_material_price_id is not null)
  )
);

create index wpi_quote_documents_org_status_idx
  on public.wpi_quote_documents(organization_id, status, created_at desc);
create index wpi_quote_documents_ai_task_idx
  on public.wpi_quote_documents(ai_task_id) where ai_task_id is not null;
create index wpi_quote_documents_supplier_idx
  on public.wpi_quote_documents(supplier_id) where supplier_id is not null;
create index wpi_quote_items_document_status_idx
  on public.wpi_quote_items(document_id, review_status, line_number);
create index wpi_quote_items_org_status_idx
  on public.wpi_quote_items(organization_id, review_status, created_at desc);
create index wpi_quote_items_equipment_target_idx
  on public.wpi_quote_items(target_equipment_price_id) where target_equipment_price_id is not null;
create index wpi_quote_items_material_target_idx
  on public.wpi_quote_items(target_material_price_id) where target_material_price_id is not null;

create trigger wpi_quote_documents_updated_at
before update on public.wpi_quote_documents
for each row execute function private.wpi_set_updated_at();

create trigger wpi_quote_items_updated_at
before update on public.wpi_quote_items
for each row execute function private.wpi_set_updated_at();

create trigger wpi_quote_documents_audit
after insert or update or delete on public.wpi_quote_documents
for each row execute function private.wpi_audit_row_change();

create trigger wpi_quote_items_audit
after insert or update or delete on public.wpi_quote_items
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_quote_documents enable row level security;
alter table public.wpi_quote_items enable row level security;

create policy wpi_quote_documents_read
on public.wpi_quote_documents for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_quote_documents_insert
on public.wpi_quote_documents for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = (select auth.uid())
);

create policy wpi_quote_documents_update
on public.wpi_quote_documents for update to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
)
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

create policy wpi_quote_items_read
on public.wpi_quote_items for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_quote_items_insert
on public.wpi_quote_items for insert to authenticated
with check (private.wpi_has_permission(organization_id, 'price.write'));

create policy wpi_quote_items_update
on public.wpi_quote_items for update to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
)
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

revoke all on public.wpi_quote_documents, public.wpi_quote_items
  from public, anon, authenticated;
grant select, insert, update on public.wpi_quote_documents, public.wpi_quote_items
  to authenticated;
grant select, insert, update, delete on public.wpi_quote_documents, public.wpi_quote_items
  to service_role;

create or replace function private.wpi_import_quote_item_impl(
  target_item_id uuid,
  corrections jsonb default '{}'::jsonb,
  reviewer_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_item public.wpi_quote_items;
  quote_document public.wpi_quote_documents;
  equipment_id uuid;
  material_id uuid;
  resolved_name text;
  resolved_type text;
  resolved_brand text;
  resolved_specification text;
  resolved_category text;
  resolved_unit text;
  resolved_currency text;
  resolved_region text;
  resolved_price_condition text;
  resolved_supplier_name text;
  resolved_unit_price numeric(18,2);
  resolved_confidence numeric(5,2);
  resolved_risk public.wpi_risk_level;
begin
  select * into quote_item
  from public.wpi_quote_items
  where id = target_item_id
  for update;

  if quote_item.id is null then
    raise exception 'Quote item not found';
  end if;
  if not private.wpi_has_permission(quote_item.organization_id, 'price.review') then
    raise exception 'Price review permission is required';
  end if;
  if quote_item.review_status = 'imported' then
    return jsonb_build_object(
      'itemId', quote_item.id,
      'itemType', quote_item.item_type,
      'equipmentPriceId', quote_item.target_equipment_price_id,
      'materialPriceId', quote_item.target_material_price_id,
      'reused', true
    );
  end if;
  if quote_item.review_status in ('rejected', 'voided') then
    raise exception 'Rejected or voided quote item cannot be imported';
  end if;

  select * into quote_document
  from public.wpi_quote_documents
  where id = quote_item.document_id
  for update;

  resolved_type := coalesce(nullif(corrections->>'itemType', ''), quote_item.item_type);
  resolved_name := btrim(coalesce(nullif(corrections->>'itemName', ''), quote_item.item_name));
  resolved_brand := nullif(btrim(coalesce(corrections->>'brand', quote_item.brand, '')), '');
  resolved_specification := nullif(btrim(coalesce(corrections->>'specification', quote_item.specification, '')), '');
  resolved_category := nullif(btrim(coalesce(corrections->>'category', quote_item.category, '')), '');
  resolved_unit := nullif(btrim(coalesce(corrections->>'unit', quote_item.unit, '')), '');
  resolved_currency := upper(btrim(coalesce(nullif(corrections->>'currency', ''), quote_item.currency, quote_document.currency, 'CNY')));
  resolved_region := nullif(btrim(coalesce(corrections->>'region', quote_item.region, '')), '');
  resolved_price_condition := nullif(btrim(coalesce(corrections->>'priceCondition', quote_item.price_condition, '')), '');
  resolved_supplier_name := nullif(btrim(coalesce(corrections->>'supplierName', quote_item.supplier_name, quote_document.supplier_name, '')), '');
  resolved_unit_price := greatest(0, coalesce(nullif(corrections->>'unitPrice', '')::numeric, quote_item.unit_price));
  resolved_confidence := greatest(0, least(100, coalesce(nullif(corrections->>'confidence', '')::numeric, quote_item.confidence)));
  resolved_risk := coalesce(nullif(corrections->>'riskLevel', '')::public.wpi_risk_level, quote_item.risk_level);

  if resolved_type not in ('equipment', 'material') then
    raise exception 'Item type must be equipment or material';
  end if;
  if resolved_name is null or resolved_name = '' then
    raise exception 'Item name is required';
  end if;
  if resolved_unit_price <= 0 then
    raise exception 'A positive unit price is required';
  end if;
  if resolved_type = 'material' and resolved_unit is null then
    raise exception 'Material unit is required';
  end if;

  if resolved_type = 'equipment' then
    insert into public.wpi_equipment_prices (
      organization_id, price_code, equipment_name, brand, model, category,
      original_price, original_currency, usd_price, price_term, supplier_id,
      source_type, valid_until, confidence, risk_level, review_status,
      technical_parameters, metadata, created_by, updated_by
    ) values (
      quote_item.organization_id,
      'EQP-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      resolved_name, resolved_brand, resolved_specification, resolved_category,
      resolved_unit_price, resolved_currency,
      case when resolved_currency = 'USD' then resolved_unit_price else null end,
      resolved_price_condition, quote_document.supplier_id,
      'ai_quote_recognition', quote_document.valid_until, resolved_confidence,
      resolved_risk, 'approved',
      jsonb_build_object('unit', resolved_unit, 'quantity', quote_item.quantity),
      jsonb_build_object(
        'quoteDocumentId', quote_document.id,
        'quoteDocumentCode', quote_document.document_code,
        'quoteItemId', quote_item.id,
        'supplierName', resolved_supplier_name,
        'quoteNumber', quote_document.quote_number,
        'quoteDate', quote_document.quote_date,
        'storageBucket', quote_document.storage_bucket,
        'storagePath', quote_document.storage_path,
        'reviewNote', nullif(btrim(reviewer_note), '')
      ),
      (select auth.uid()), (select auth.uid())
    ) returning id into equipment_id;
  else
    insert into public.wpi_material_prices (
      organization_id, price_code, material_name, specification, category, unit,
      price, currency, region, supplier_id, source_type, valid_until,
      confidence, risk_level, review_status, metadata, created_by, updated_by
    ) values (
      quote_item.organization_id,
      'MAT-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      resolved_name, resolved_specification, resolved_category, resolved_unit,
      resolved_unit_price, resolved_currency, resolved_region, quote_document.supplier_id,
      'ai_quote_recognition', quote_document.valid_until, resolved_confidence,
      resolved_risk, 'approved',
      jsonb_build_object(
        'quoteDocumentId', quote_document.id,
        'quoteDocumentCode', quote_document.document_code,
        'quoteItemId', quote_item.id,
        'brand', resolved_brand,
        'supplierName', resolved_supplier_name,
        'quoteNumber', quote_document.quote_number,
        'quoteDate', quote_document.quote_date,
        'storageBucket', quote_document.storage_bucket,
        'storagePath', quote_document.storage_path,
        'reviewNote', nullif(btrim(reviewer_note), '')
      ),
      (select auth.uid()), (select auth.uid())
    ) returning id into material_id;
  end if;

  update public.wpi_quote_items
  set item_type = resolved_type,
      item_name = resolved_name,
      brand = resolved_brand,
      specification = resolved_specification,
      category = resolved_category,
      unit = resolved_unit,
      unit_price = resolved_unit_price,
      total_price = round(resolved_unit_price * quote_item.quantity, 2),
      currency = resolved_currency,
      region = resolved_region,
      price_condition = resolved_price_condition,
      supplier_name = resolved_supplier_name,
      confidence = resolved_confidence,
      risk_level = resolved_risk,
      missing_fields = '{}',
      review_status = 'imported',
      review_note = nullif(btrim(reviewer_note), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      target_equipment_price_id = equipment_id,
      target_material_price_id = material_id
  where id = quote_item.id;

  update public.wpi_quote_documents
  set status = case
        when exists (
          select 1 from public.wpi_quote_items
          where document_id = quote_document.id
            and review_status not in ('imported', 'rejected', 'voided')
        ) then 'partially_imported'
        else 'imported'
      end,
      updated_by = (select auth.uid())
  where id = quote_document.id;

  return jsonb_build_object(
    'itemId', quote_item.id,
    'documentId', quote_document.id,
    'itemType', resolved_type,
    'equipmentPriceId', equipment_id,
    'materialPriceId', material_id,
    'reused', false
  );
end;
$$;

revoke all on function private.wpi_import_quote_item_impl(uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function private.wpi_import_quote_item_impl(uuid, jsonb, text)
  to authenticated;

create or replace function public.wpi_import_quote_item(
  target_item_id uuid,
  corrections jsonb default '{}'::jsonb,
  reviewer_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.wpi_import_quote_item_impl(target_item_id, corrections, reviewer_note);
$$;

revoke all on function public.wpi_import_quote_item(uuid, jsonb, text)
  from public, anon;
grant execute on function public.wpi_import_quote_item(uuid, jsonb, text)
  to authenticated;

comment on table public.wpi_quote_documents is
  'Organization-scoped quote source file ledger for real Storage uploads and AI-assisted recognition.';
comment on table public.wpi_quote_items is
  'Line-level quote recognition and human-review ledger. AI output never imports directly.';
comment on function public.wpi_import_quote_item(uuid, jsonb, text) is
  'Atomically applies reviewer corrections, creates one approved equipment/material price and links the source quote item.';

;
