create table public.wpi_equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  catalog_code text not null,
  equipment_name text not null check (length(btrim(equipment_name)) between 1 and 240),
  normalized_name text not null default '',
  equipment_category text not null default '',
  equipment_type text not null default '',
  brand text not null default '',
  manufacturer text not null default '',
  product_series text not null default '',
  model text not null default '',
  specification text not null default '',
  application text not null default '',
  technical_standard text not null default '',
  country_code text not null default '',
  language text not null default 'zh-CN',
  datasheet_url text,
  catalog_url text,
  source_url text,
  source_type text not null default 'manual',
  source_supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  parameter_completeness numeric(5,2) not null default 0
    check (parameter_completeness between 0 and 100),
  ai_extracted boolean not null default false,
  ai_confidence numeric(5,2) not null default 0 check (ai_confidence between 0 and 100),
  review_status public.wpi_review_status not null default 'draft',
  risk_level public.wpi_risk_level not null default 'medium',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, catalog_code)
)
create table public.wpi_equipment_catalog_parameters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  parameter_code text not null,
  parameter_name text not null,
  raw_value text not null default '',
  normalized_value text not null default '',
  data_type text not null default 'text'
    check (data_type in ('text', 'number', 'boolean', 'range', 'enum')),
  unit text not null default '',
  minimum_value numeric(18,6),
  maximum_value numeric(18,6),
  is_key boolean not null default false,
  source_page integer check (source_page is null or source_page > 0),
  source_evidence jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  review_status public.wpi_review_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_catalog_id, parameter_code)
)
create table public.wpi_supplier_equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  supply_type text not null default 'supplier'
    check (supply_type in ('manufacturer', 'authorized_agent', 'distributor', 'supplier', 'service_provider')),
  authorized_status text not null default 'unverified'
    check (authorized_status in ('unverified', 'verified', 'expired', 'rejected')),
  service_regions jsonb not null default '[]'::jsonb,
  evidence_url text,
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  review_status public.wpi_review_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_id, equipment_catalog_id)
)
create table public.wpi_equipment_catalog_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  attachment_id uuid references public.wpi_attachments(id) on delete set null,
  source_type text not null default 'manual',
  source_title text not null default '',
  source_url text,
  language text not null default 'zh-CN',
  source_page integer check (source_page is null or source_page > 0),
  bounding_box jsonb not null default '{}'::jsonb,
  content_checksum text,
  checked_at timestamptz,
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  review_status public.wpi_review_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
create table public.wpi_equipment_catalog_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision public.wpi_review_status not null,
  changed_fields jsonb not null default '{}'::jsonb,
  notes text not null default '',
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
)
alter table public.wpi_equipment_prices
  add column if not exists equipment_catalog_id uuid
    references public.wpi_equipment_catalog(id) on delete set null
alter table public.wpi_project_pricing_items
  add column if not exists equipment_catalog_id uuid
    references public.wpi_equipment_catalog(id) on delete set null,
  add column if not exists catalog_match_status text not null default 'unmatched'
    check (catalog_match_status in ('unmatched', 'exact', 'compatible', 'partial', 'conflict', 'needs_review'))
create index wpi_equipment_catalog_org_updated_idx
  on public.wpi_equipment_catalog(organization_id, updated_at desc)
create index wpi_equipment_catalog_search_idx
  on public.wpi_equipment_catalog(organization_id, equipment_category, brand, model)
create unique index wpi_equipment_catalog_identity_key
  on public.wpi_equipment_catalog(
    organization_id,
    lower(equipment_name),
    lower(brand),
    lower(model)
  )
create index wpi_equipment_catalog_parameters_catalog_idx
  on public.wpi_equipment_catalog_parameters(equipment_catalog_id, is_key desc, parameter_name)
create index wpi_supplier_equipment_catalog_supplier_idx
  on public.wpi_supplier_equipment_catalog(organization_id, supplier_id, review_status)
create index wpi_supplier_equipment_catalog_catalog_idx
  on public.wpi_supplier_equipment_catalog(equipment_catalog_id, review_status)
create index wpi_equipment_catalog_sources_catalog_idx
  on public.wpi_equipment_catalog_sources(equipment_catalog_id, created_at desc)
create index wpi_equipment_catalog_reviews_catalog_idx
  on public.wpi_equipment_catalog_reviews(equipment_catalog_id, reviewed_at desc)
create index wpi_equipment_prices_catalog_idx
  on public.wpi_equipment_prices(organization_id, equipment_catalog_id)
  where equipment_catalog_id is not null
create index wpi_project_pricing_items_catalog_idx
  on public.wpi_project_pricing_items(organization_id, equipment_catalog_id)
  where equipment_catalog_id is not null
create trigger wpi_equipment_catalog_updated_at
before update on public.wpi_equipment_catalog
for each row execute function private.wpi_set_updated_at()
create trigger wpi_equipment_catalog_parameters_updated_at
before update on public.wpi_equipment_catalog_parameters
for each row execute function private.wpi_set_updated_at()
create trigger wpi_supplier_equipment_catalog_updated_at
before update on public.wpi_supplier_equipment_catalog
for each row execute function private.wpi_set_updated_at()
create trigger wpi_equipment_catalog_sources_updated_at
before update on public.wpi_equipment_catalog_sources
for each row execute function private.wpi_set_updated_at()
create trigger wpi_equipment_catalog_audit
after insert or update or delete on public.wpi_equipment_catalog
for each row execute function private.wpi_audit_row_change()
create trigger wpi_equipment_catalog_parameters_audit
after insert or update or delete on public.wpi_equipment_catalog_parameters
for each row execute function private.wpi_audit_row_change()
create trigger wpi_supplier_equipment_catalog_audit
after insert or update or delete on public.wpi_supplier_equipment_catalog
for each row execute function private.wpi_audit_row_change()
create trigger wpi_equipment_catalog_sources_audit
after insert or update or delete on public.wpi_equipment_catalog_sources
for each row execute function private.wpi_audit_row_change()
create trigger wpi_equipment_catalog_reviews_audit
after insert or update or delete on public.wpi_equipment_catalog_reviews
for each row execute function private.wpi_audit_row_change()
alter table public.wpi_equipment_catalog enable row level security
alter table public.wpi_equipment_catalog_parameters enable row level security
alter table public.wpi_supplier_equipment_catalog enable row level security
alter table public.wpi_equipment_catalog_sources enable row level security
alter table public.wpi_equipment_catalog_reviews enable row level security
create policy wpi_equipment_catalog_read
on public.wpi_equipment_catalog for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'))
create policy wpi_equipment_catalog_insert
on public.wpi_equipment_catalog for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = (select auth.uid())
)
create policy wpi_equipment_catalog_update
on public.wpi_equipment_catalog for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'))
create policy wpi_equipment_catalog_delete
on public.wpi_equipment_catalog for delete to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'))
create policy wpi_equipment_catalog_parameters_read
on public.wpi_equipment_catalog_parameters for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'))
create policy wpi_equipment_catalog_parameters_insert
on public.wpi_equipment_catalog_parameters for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = (select auth.uid())
)
create policy wpi_equipment_catalog_parameters_update
on public.wpi_equipment_catalog_parameters for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'))
create policy wpi_equipment_catalog_parameters_delete
on public.wpi_equipment_catalog_parameters for delete to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'))
create policy wpi_supplier_equipment_catalog_read
on public.wpi_supplier_equipment_catalog for select to authenticated
using (private.wpi_has_permission(organization_id, 'supplier.read'))
create policy wpi_supplier_equipment_catalog_insert
on public.wpi_supplier_equipment_catalog for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'supplier.write')
  and created_by = (select auth.uid())
)
create policy wpi_supplier_equipment_catalog_update
on public.wpi_supplier_equipment_catalog for update to authenticated
using (private.wpi_has_permission(organization_id, 'supplier.write'))
with check (private.wpi_has_permission(organization_id, 'supplier.write'))
create policy wpi_supplier_equipment_catalog_delete
on public.wpi_supplier_equipment_catalog for delete to authenticated
using (private.wpi_has_permission(organization_id, 'supplier.review'))
create policy wpi_equipment_catalog_sources_read
on public.wpi_equipment_catalog_sources for select to authenticated
using (private.wpi_has_permission(organization_id, 'file.read'))
create policy wpi_equipment_catalog_sources_insert
on public.wpi_equipment_catalog_sources for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'file.write')
  and created_by = (select auth.uid())
)
create policy wpi_equipment_catalog_sources_update
on public.wpi_equipment_catalog_sources for update to authenticated
using (private.wpi_has_permission(organization_id, 'file.write'))
with check (private.wpi_has_permission(organization_id, 'file.write'))
create policy wpi_equipment_catalog_sources_delete
on public.wpi_equipment_catalog_sources for delete to authenticated
using (private.wpi_has_permission(organization_id, 'file.delete'))
create policy wpi_equipment_catalog_reviews_read
on public.wpi_equipment_catalog_reviews for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'))
create policy wpi_equipment_catalog_reviews_insert
on public.wpi_equipment_catalog_reviews for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.review')
  and reviewer_id = (select auth.uid())
)
create or replace function public.wpi_review_equipment_catalog(
  p_catalog_id uuid,
  p_decision public.wpi_review_status,
  p_notes text default ''
) returns public.wpi_equipment_catalog
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_result public.wpi_equipment_catalog;
begin
  select organization_id into v_organization_id
  from public.wpi_equipment_catalog
  where id = p_catalog_id;

  if v_organization_id is null then
    raise exception 'Equipment catalog record not found';
  end if;
  if not private.wpi_has_permission(v_organization_id, 'price.review') then
    raise exception 'Permission denied';
  end if;
  if p_decision not in ('approved', 'rejected', 'pending_review') then
    raise exception 'Unsupported review decision';
  end if;

  insert into public.wpi_equipment_catalog_reviews (
    organization_id, equipment_catalog_id, reviewer_id, decision, notes
  ) values (
    v_organization_id, p_catalog_id, (select auth.uid()), p_decision,
    left(coalesce(p_notes, ''), 2000)
  );

  update public.wpi_equipment_catalog
  set review_status = p_decision, updated_by = (select auth.uid())
  where id = p_catalog_id
  returning * into v_result;

  return v_result;
end;
$$
revoke all on function public.wpi_review_equipment_catalog(uuid, public.wpi_review_status, text)
  from public, anon
grant execute on function public.wpi_review_equipment_catalog(uuid, public.wpi_review_status, text)
  to authenticated, service_role
revoke all on public.wpi_equipment_catalog from public, anon
revoke all on public.wpi_equipment_catalog_parameters from public, anon
revoke all on public.wpi_supplier_equipment_catalog from public, anon
revoke all on public.wpi_equipment_catalog_sources from public, anon
revoke all on public.wpi_equipment_catalog_reviews from public, anon
grant select, insert, update, delete on public.wpi_equipment_catalog to authenticated
grant select, insert, update, delete on public.wpi_equipment_catalog_parameters to authenticated
grant select, insert, update, delete on public.wpi_supplier_equipment_catalog to authenticated
grant select, insert, update, delete on public.wpi_equipment_catalog_sources to authenticated
grant select, insert on public.wpi_equipment_catalog_reviews to authenticated
grant all on public.wpi_equipment_catalog to service_role
grant all on public.wpi_equipment_catalog_parameters to service_role
grant all on public.wpi_supplier_equipment_catalog to service_role
grant all on public.wpi_equipment_catalog_sources to service_role
grant all on public.wpi_equipment_catalog_reviews to service_role
with ranked_prices as (
  select
    price.*,
    row_number() over (
      partition by price.organization_id, lower(price.equipment_name),
        lower(coalesce(price.brand, '')), lower(coalesce(price.model, ''))
      order by price.updated_at desc, price.created_at desc
    ) as identity_rank,
    min(price.created_at) over (
      partition by price.organization_id, lower(price.equipment_name),
        lower(coalesce(price.brand, '')), lower(coalesce(price.model, ''))
    ) as first_seen_at,
    max(price.updated_at) over (
      partition by price.organization_id, lower(price.equipment_name),
        lower(coalesce(price.brand, '')), lower(coalesce(price.model, ''))
    ) as last_seen_at
  from public.wpi_equipment_prices price
  where price.deleted_at is null
)
insert into public.wpi_equipment_catalog (
  organization_id,
  catalog_code,
  equipment_name,
  normalized_name,
  equipment_category,
  brand,
  manufacturer,
  model,
  specification,
  source_url,
  source_type,
  source_supplier_id,
  parameter_completeness,
  ai_extracted,
  ai_confidence,
  review_status,
  risk_level,
  metadata,
  created_by,
  updated_by,
  created_at,
  updated_at
)
select
  price.organization_id,
  'CAT-' || upper(substr(md5(
    price.organization_id::text || '|' || lower(price.equipment_name) || '|' ||
    lower(coalesce(price.brand, '')) || '|' || lower(coalesce(price.model, ''))
  ), 1, 12)),
  price.equipment_name,
  lower(regexp_replace(price.equipment_name, '\\s+', ' ', 'g')),
  coalesce(price.category, ''),
  coalesce(price.brand, ''),
  coalesce(price.brand, ''),
  coalesce(price.model, ''),
  coalesce(price.model, ''),
  price.source_url,
  coalesce(price.source_type, 'price_backfill'),
  price.supplier_id,
  case
    when jsonb_typeof(price.technical_parameters) = 'object'
      then least(
        95,
        45 + (select count(*) from jsonb_object_keys(price.technical_parameters))::integer * 8
      )
    else 45
  end,
  false,
  coalesce(price.confidence, 60),
  case when price.review_status = 'approved' then 'approved'::public.wpi_review_status
       else 'pending_review'::public.wpi_review_status end,
  price.risk_level,
  jsonb_build_object('backfilledFromPrice', true, 'sourcePriceId', price.id),
  price.created_by,
  coalesce(price.updated_by, price.created_by),
  price.first_seen_at,
  price.last_seen_at
from ranked_prices price
where price.identity_rank = 1
on conflict do nothing
update public.wpi_equipment_prices price
set equipment_catalog_id = catalog.id
from public.wpi_equipment_catalog catalog
where catalog.organization_id = price.organization_id
  and lower(catalog.equipment_name) = lower(price.equipment_name)
  and lower(catalog.brand) = lower(coalesce(price.brand, ''))
  and lower(catalog.model) = lower(coalesce(price.model, ''))
  and price.equipment_catalog_id is null
insert into public.wpi_equipment_catalog_parameters (
  organization_id,
  equipment_catalog_id,
  parameter_code,
  parameter_name,
  raw_value,
  normalized_value,
  is_key,
  source_evidence,
  confidence,
  review_status,
  created_by,
  updated_by
)
select distinct on (price.equipment_catalog_id, parameter.key)
  price.organization_id,
  price.equipment_catalog_id,
  'param_' || substr(md5(parameter.key), 1, 16),
  left(parameter.key, 180),
  left(parameter.value, 1000),
  left(parameter.value, 1000),
  parameter.key ~* '(流量|扬程|功率|口径|压力|材质|flow|head|power|diameter|pressure|material)',
  jsonb_build_object('sourcePriceId', price.id, 'backfilledFromPrice', true),
  coalesce(price.confidence, 60),
  case when price.review_status = 'approved' then 'approved'::public.wpi_review_status
       else 'pending_review'::public.wpi_review_status end,
  price.created_by,
  coalesce(price.updated_by, price.created_by)
from public.wpi_equipment_prices price
cross join lateral jsonb_each_text(
  case when jsonb_typeof(price.technical_parameters) = 'object'
    then price.technical_parameters else '{}'::jsonb end
) parameter
where price.deleted_at is null
  and price.equipment_catalog_id is not null
  and jsonb_typeof(price.technical_parameters) = 'object'
order by price.equipment_catalog_id, parameter.key, price.updated_at desc
on conflict do nothing
insert into public.wpi_equipment_catalog_sources (
  organization_id,
  equipment_catalog_id,
  supplier_id,
  source_type,
  source_title,
  source_url,
  checked_at,
  confidence,
  review_status,
  metadata,
  created_by,
  updated_by
)
select distinct on (price.equipment_catalog_id, coalesce(price.source_url, ''), coalesce(price.source_type, ''))
  price.organization_id,
  price.equipment_catalog_id,
  price.supplier_id,
  coalesce(nullif(price.source_type, ''), 'price_backfill'),
  price.equipment_name || '价格来源',
  price.source_url,
  price.updated_at,
  coalesce(price.confidence, 60),
  case when price.review_status = 'approved' then 'approved'::public.wpi_review_status
       else 'pending_review'::public.wpi_review_status end,
  jsonb_build_object('sourcePriceId', price.id, 'backfilledFromPrice', true),
  price.created_by,
  coalesce(price.updated_by, price.created_by)
from public.wpi_equipment_prices price
where price.deleted_at is null
  and price.equipment_catalog_id is not null
order by price.equipment_catalog_id, coalesce(price.source_url, ''),
  coalesce(price.source_type, ''), price.updated_at desc
insert into public.wpi_supplier_equipment_catalog (
  organization_id,
  supplier_id,
  equipment_catalog_id,
  supply_type,
  authorized_status,
  evidence_url,
  confidence,
  review_status,
  metadata,
  created_by,
  updated_by
)
select distinct on (price.organization_id, price.supplier_id, price.equipment_catalog_id)
  price.organization_id,
  price.supplier_id,
  price.equipment_catalog_id,
  'supplier',
  'unverified',
  price.source_url,
  coalesce(price.confidence, 60),
  'pending_review'::public.wpi_review_status,
  jsonb_build_object('backfilledFromPrice', true, 'sourcePriceId', price.id),
  price.created_by,
  coalesce(price.updated_by, price.created_by)
from public.wpi_equipment_prices price
where price.supplier_id is not null
  and price.equipment_catalog_id is not null
on conflict do nothing
comment on table public.wpi_equipment_catalog is
  'Organization-scoped equipment master data. It describes products and models, never prices.'
comment on table public.wpi_equipment_catalog_parameters is
  'Normalized and source-traceable technical parameters for equipment catalog records.'
comment on table public.wpi_supplier_equipment_catalog is
  'Reviewed supplier capability relationships. Price facts remain in wpi_equipment_prices.'
comment on table public.wpi_equipment_catalog_sources is
  'Source snapshots and evidence locations supporting equipment catalog fields.'
comment on table public.wpi_equipment_catalog_reviews is
  'Human review decisions for AI-assisted equipment master data.'
