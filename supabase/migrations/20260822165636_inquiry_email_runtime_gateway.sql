create or replace function public.wpi_get_runtime_integration(
  target_organization_id uuid,
  target_integration_code text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', integration.id,
    'provider', integration.provider,
    'endpointUrl', integration.endpoint_url,
    'status', integration.status,
    'config', integration.config,
    'credential', secret.decrypted_secret
  )
  from public.wpi_integrations integration
  left join vault.decrypted_secrets secret on secret.id = integration.secret_id
  where integration.organization_id = target_organization_id
    and integration.integration_code = upper(target_integration_code)
  limit 1;
$$;

revoke all on function public.wpi_get_runtime_integration(uuid, text) from public, anon, authenticated;
grant execute on function public.wpi_get_runtime_integration(uuid, text) to service_role;

comment on function public.wpi_get_runtime_integration(uuid, text) is
  'Server runtime only. Returns one organization-scoped integration with its Vault secret.';

;
