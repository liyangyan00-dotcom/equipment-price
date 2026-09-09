create table public.wpi_ai_gateway_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid() unique,
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  integration_id uuid references public.wpi_integrations(id) on delete set null,
  action text not null check (action in ('execute', 'validate')),
  workflow_key text not null,
  business_object_type text,
  business_object_id uuid,
  business_run_id uuid,
  status text not null default 'running'
    check (status in ('queued', 'running', 'completed', 'needs_review', 'failed', 'cancelled')),
  provider text not null,
  model text not null,
  prompt_key text,
  prompt_version text,
  schema_version text,
  input_hash text,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level,
  requires_human_review boolean not null default true,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost_usd numeric(14,8) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  http_status integer,
  error_code text,
  error_message text,
  requested_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_ai_gateway_runs_input_object check (jsonb_typeof(input_snapshot) = 'object'),
  constraint wpi_ai_gateway_runs_output_object check (
    output_payload is null or jsonb_typeof(output_payload) = 'object'
  )
);

create index wpi_ai_gateway_runs_org_created_idx
  on public.wpi_ai_gateway_runs(organization_id, created_at desc);
create index wpi_ai_gateway_runs_org_status_idx
  on public.wpi_ai_gateway_runs(organization_id, status, created_at desc);
create index wpi_ai_gateway_runs_requested_by_idx
  on public.wpi_ai_gateway_runs(requested_by, created_at desc);
create index wpi_ai_gateway_runs_business_run_idx
  on public.wpi_ai_gateway_runs(business_run_id)
  where business_run_id is not null;

create trigger wpi_ai_gateway_runs_updated_at
before update on public.wpi_ai_gateway_runs
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_ai_gateway_runs enable row level security;

create policy wpi_ai_gateway_runs_read
on public.wpi_ai_gateway_runs
for select to authenticated
using (
  requested_by = (select auth.uid())
  or private.wpi_has_permission(organization_id, 'audit.read')
);

revoke all on public.wpi_ai_gateway_runs from public, anon, authenticated;
grant select on public.wpi_ai_gateway_runs to authenticated;
grant select, insert, update, delete on public.wpi_ai_gateway_runs to service_role;

create or replace function public.wpi_get_ai_runtime_integration(
  target_organization_id uuid,
  target_integration_id uuid default null,
  target_integration_code text default null
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
    and integration.integration_type = 'ai_provider'
    and (
      (target_integration_id is not null and integration.id = target_integration_id)
      or (
        target_integration_id is null
        and target_integration_code is not null
        and integration.integration_code = target_integration_code
      )
    )
  limit 1;
$$;

revoke all on function public.wpi_get_ai_runtime_integration(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.wpi_get_ai_runtime_integration(uuid, uuid, text)
  to service_role;

comment on table public.wpi_ai_gateway_runs is
  'Immutable organization-scoped telemetry for authenticated AI provider executions. Provider secrets are never stored here.';
comment on function public.wpi_get_ai_runtime_integration(uuid, uuid, text) is
  'Service-role-only runtime lookup for an AI integration and its Vault credential. Never expose this RPC to clients.';
