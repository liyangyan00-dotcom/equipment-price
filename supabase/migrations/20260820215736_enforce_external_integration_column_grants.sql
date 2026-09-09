revoke all on public.wpi_integrations from authenticated;

grant select, delete on public.wpi_integrations to authenticated;
grant insert (
  organization_id,
  integration_code,
  integration_type,
  name,
  provider,
  description,
  endpoint_url,
  config,
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
) on public.wpi_integrations to authenticated;;
