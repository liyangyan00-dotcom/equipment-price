alter table public.wpi_price_collection_sources
  add column if not exists api_integration_id uuid references public.wpi_integrations(id) on delete set null,
  add column if not exists discovery_enabled boolean not null default false,
  add column if not exists max_discovery_depth smallint not null default 2
    check (max_discovery_depth between 0 and 5);
create index if not exists wpi_collection_sources_api_integration_idx
  on public.wpi_price_collection_sources(api_integration_id)
  where api_integration_id is not null;
create table public.wpi_equipment_collection_discoveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_id uuid not null references public.wpi_price_collection_tasks(id) on delete cascade,
  run_id uuid references public.wpi_price_collection_runs(id) on delete set null,
  source_id uuid not null references public.wpi_price_collection_sources(id) on delete cascade,
  resource_url text not null,
  url_hash text not null,
  parent_url text,
  resource_type text not null default 'page'
    check (resource_type in ('seed', 'page', 'product', 'catalog', 'pdf', 'api')),
  depth smallint not null default 0 check (depth between 0 and 8),
  status text not null default 'queued'
    check (status in ('queued', 'fetching', 'fetched', 'tracked', 'blocked', 'failed', 'skipped')),
  page_title text,
  mime_type text,
  http_status integer,
  content_hash text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  discovered_at timestamptz not null default now(),
  fetched_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_id, url_hash)
);
create index wpi_equipment_discoveries_task_status_idx
  on public.wpi_equipment_collection_discoveries(task_id, status, resource_type, discovered_at);
create index wpi_equipment_discoveries_run_idx
  on public.wpi_equipment_collection_discoveries(run_id)
  where run_id is not null;
create index wpi_equipment_discoveries_updated_by_idx
  on public.wpi_equipment_collection_discoveries(updated_by)
  where updated_by is not null;
create trigger wpi_equipment_discoveries_updated_at
before update on public.wpi_equipment_collection_discoveries
for each row execute function private.wpi_set_updated_at();
create trigger wpi_equipment_discoveries_audit
after insert or update or delete on public.wpi_equipment_collection_discoveries
for each row execute function private.wpi_audit_row_change();
alter table public.wpi_equipment_collection_discoveries enable row level security;
create policy wpi_equipment_discoveries_read
on public.wpi_equipment_collection_discoveries
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_equipment_discoveries_write
on public.wpi_equipment_collection_discoveries
for all to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and created_by = (select auth.uid())
  and (updated_by is null or updated_by = (select auth.uid()))
);
revoke all on public.wpi_equipment_collection_discoveries from public, anon, authenticated;
grant select, insert, update, delete on public.wpi_equipment_collection_discoveries to authenticated, service_role;
grant update (api_integration_id, discovery_enabled, max_discovery_depth) on public.wpi_price_collection_sources to authenticated;
create or replace function public.wpi_get_collection_runtime_integration(
  target_organization_id uuid,
  target_integration_id uuid
)
returns table (
  integration_id uuid,
  integration_code text,
  provider text,
  endpoint_url text,
  status text,
  credential_state text,
  config jsonb,
  credential_secret text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    integration.id,
    integration.integration_code,
    integration.provider,
    integration.endpoint_url,
    integration.status,
    integration.credential_state,
    integration.config,
    secret.decrypted_secret
  from public.wpi_integrations integration
  left join vault.decrypted_secrets secret on secret.id = integration.secret_id
  where integration.organization_id = target_organization_id
    and integration.id = target_integration_id
    and integration.integration_type = 'data_source'
    and coalesce((integration.config ->> 'supplierApi')::boolean, false) = true
  limit 1;
$$;
revoke all on function public.wpi_get_collection_runtime_integration(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.wpi_get_collection_runtime_integration(uuid, uuid)
  to service_role;
insert into public.wpi_integrations (
  organization_id,
  integration_code,
  integration_type,
  name,
  provider,
  description,
  endpoint_url,
  status,
  config,
  is_system,
  created_by,
  updated_by
)
select
  organization.id,
  'SUPPLIER_API_KSB',
  'data_source',
  'KSB 产品 API',
  'KSB',
  'KSB 授权产品数据接口。凭证保存在 Supabase Vault，采集结果必须进入人工审核。',
  null,
  'unconfigured',
  jsonb_build_object(
    'supplierApi', true,
    'brand', 'KSB',
    'authType', 'bearer',
    'headerName', 'Authorization',
    'humanReview', true,
    'aiFinalDecision', false
  ),
  true,
  organization.created_by,
  organization.created_by
from public.wpi_organizations organization
on conflict (organization_id, integration_code) do nothing;
comment on table public.wpi_equipment_collection_discoveries is
  'Bounded, auditable discovery queue for equipment product pages, catalogues and PDF links.';
comment on function public.wpi_get_collection_runtime_integration(uuid, uuid) is
  'Service-role-only lookup for supplier API runtime credentials stored in Vault.';
