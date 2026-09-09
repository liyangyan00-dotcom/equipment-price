create table public.wpi_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  integration_code text not null,
  integration_type text not null check (integration_type in (
    'collector',
    'ai_provider',
    'email',
    'webhook',
    'data_source'
  )),
  name text not null,
  provider text not null,
  description text,
  endpoint_url text,
  status text not null default 'unconfigured' check (status in (
    'unconfigured',
    'active',
    'disabled',
    'error'
  )),
  credential_state text not null default 'missing' check (credential_state in (
    'missing',
    'configured',
    'expiring'
  )),
  credential_hint text,
  secret_id uuid,
  config jsonb not null default '{}'::jsonb,
  last_validated_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  is_system boolean not null default false,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_integrations_code_format check (integration_code ~ '^[A-Z0-9][A-Z0-9_.-]{0,63}$'),
  constraint wpi_integrations_name_not_blank check (length(btrim(name)) between 1 and 100),
  constraint wpi_integrations_provider_not_blank check (length(btrim(provider)) between 1 and 100),
  constraint wpi_integrations_endpoint_length check (endpoint_url is null or length(endpoint_url) <= 500),
  constraint wpi_integrations_hint_length check (credential_hint is null or length(credential_hint) <= 80),
  unique (organization_id, integration_code)
);

create index wpi_integrations_org_status_idx
  on public.wpi_integrations(organization_id, status, integration_type);
create index wpi_integrations_updated_by_idx
  on public.wpi_integrations(updated_by)
  where updated_by is not null;
create index wpi_integrations_created_by_idx
  on public.wpi_integrations(created_by);

create trigger wpi_integrations_updated_at
before update on public.wpi_integrations
for each row execute function private.wpi_set_updated_at();

create trigger wpi_integrations_audit
after insert or update or delete on public.wpi_integrations
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_integrations enable row level security;

create policy wpi_integrations_read on public.wpi_integrations
for select to authenticated
using (private.wpi_is_org_member(organization_id));

create policy wpi_integrations_insert on public.wpi_integrations
for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and created_by = (select auth.uid())
  and (updated_by is null or updated_by = (select auth.uid()))
);

create policy wpi_integrations_update on public.wpi_integrations
for update to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and updated_by = (select auth.uid())
);

create policy wpi_integrations_delete on public.wpi_integrations
for delete to authenticated
using (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and not is_system
);

revoke all on public.wpi_integrations from anon;
revoke all on public.wpi_integrations from public;
grant select, delete on public.wpi_integrations to authenticated;
grant insert (
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
) on public.wpi_integrations to authenticated;
grant update (
  name,
  provider,
  description,
  endpoint_url,
  status,
  config,
  last_validated_at,
  last_success_at,
  last_error,
  updated_by
) on public.wpi_integrations to authenticated;
grant select, insert, update, delete on public.wpi_integrations to service_role;

create or replace function public.wpi_set_integration_credential(
  target_integration_id uuid,
  credential_value text,
  credential_hint text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_row public.wpi_integrations%rowtype;
  stored_secret_id uuid;
  vault_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if credential_value is null or length(btrim(credential_value)) < 6 or length(credential_value) > 4096 then
    raise exception 'credential must contain between 6 and 4096 characters';
  end if;

  select * into target_row
  from public.wpi_integrations
  where id = target_integration_id
  for update;

  if not found then
    raise exception 'integration not found';
  end if;

  if not private.wpi_has_permission(target_row.organization_id, 'settings.manage') then
    raise exception 'permission denied';
  end if;

  vault_name := 'wpi-integration-' || target_row.organization_id::text || '-' || lower(target_row.integration_code);

  if target_row.secret_id is null then
    stored_secret_id := vault.create_secret(
      credential_value,
      vault_name,
      'Credential for WPI integration ' || target_row.integration_code
    );
  else
    perform vault.update_secret(
      target_row.secret_id,
      credential_value,
      vault_name,
      'Credential for WPI integration ' || target_row.integration_code
    );
    stored_secret_id := target_row.secret_id;
  end if;

  update public.wpi_integrations
  set secret_id = stored_secret_id,
      credential_state = 'configured',
      credential_hint = left(nullif(btrim(credential_hint), ''), 80),
      status = case when status = 'error' then 'unconfigured' else status end,
      last_error = null,
      updated_by = (select auth.uid())
  where id = target_integration_id;

  return true;
end;
$$;

create or replace function public.wpi_clear_integration_credential(
  target_integration_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_row public.wpi_integrations%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  select * into target_row
  from public.wpi_integrations
  where id = target_integration_id
  for update;

  if not found then
    raise exception 'integration not found';
  end if;

  if not private.wpi_has_permission(target_row.organization_id, 'settings.manage') then
    raise exception 'permission denied';
  end if;

  update public.wpi_integrations
  set secret_id = null,
      credential_state = 'missing',
      credential_hint = null,
      status = 'unconfigured',
      last_validated_at = null,
      last_success_at = null,
      last_error = null,
      updated_by = (select auth.uid())
  where id = target_integration_id;

  if target_row.secret_id is not null then
    delete from vault.secrets where id = target_row.secret_id;
  end if;

  return true;
end;
$$;

revoke all on function public.wpi_set_integration_credential(uuid, text, text) from public, anon;
revoke all on function public.wpi_clear_integration_credential(uuid) from public, anon;
grant execute on function public.wpi_set_integration_credential(uuid, text, text) to authenticated;
grant execute on function public.wpi_clear_integration_credential(uuid) to authenticated;

with seed(integration_code, integration_type, name, provider, description, config) as (
  values
    ('PRICE_WEB_COLLECTOR', 'collector', '价格网页采集器', 'WPI Collector', '采集制造商官网、电商平台和公开价格信息，所有结果进入人工评估。', '{"frequency":"daily","concurrency":2,"humanReview":true}'::jsonb),
    ('OPENAI_COMPATIBLE', 'ai_provider', 'AI 模型服务', 'OpenAI Compatible', '为报价识别、价格推荐、BOQ 解析和报告生成提供模型能力。', '{"model":"gpt-5-mini","timeoutSeconds":60,"humanReview":true}'::jsonb),
    ('SMTP_OUTBOUND', 'email', '询价邮件服务', 'SMTP', '发送询价函、供应商提醒和报告通知。', '{"senderName":"水厂价格情报系统","senderAddress":"procurement@example.com"}'::jsonb),
    ('BUSINESS_WEBHOOK', 'webhook', '业务事件 Webhook', 'Generic Webhook', '向获批的外围系统推送审核、询价和报告状态事件。', '{"events":"review.approved,inquiry.created,report.completed"}'::jsonb),
    ('EXCHANGE_RATE_SOURCE', 'data_source', '汇率数据源', 'Exchange Rate Provider', '更新项目套价使用的法定币种汇率。', '{"frequency":"daily","baseCurrency":"USD"}'::jsonb),
    ('SUPPLIER_REGISTRY', 'data_source', '供应商工商数据源', 'Enterprise Registry', '辅助供应商主体消歧与工商合规核验，结果必须人工确认。', '{"frequency":"manual","humanReview":true}'::jsonb)
)
insert into public.wpi_integrations (
  organization_id,
  integration_code,
  integration_type,
  name,
  provider,
  description,
  config,
  is_system,
  created_by
)
select
  organization.id,
  seed.integration_code,
  seed.integration_type,
  seed.name,
  seed.provider,
  seed.description,
  seed.config,
  true,
  organization.created_by
from public.wpi_organizations organization
cross join seed
on conflict (organization_id, integration_code) do nothing;

;
