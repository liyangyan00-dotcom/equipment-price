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
#variable_conflict use_variable
declare
  target_row public.wpi_integrations%rowtype;
  stored_secret_id uuid;
  vault_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if credential_value is null
     or length(btrim(credential_value)) < 6
     or length(credential_value) > 4096 then
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

  vault_name := 'wpi-integration-'
    || target_row.organization_id::text
    || '-'
    || lower(target_row.integration_code);

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
      status = 'unconfigured',
      last_validated_at = null,
      last_success_at = null,
      last_error = null,
      updated_by = (select auth.uid())
  where id = target_integration_id;

  return true;
end;
$$;

revoke all on function public.wpi_set_integration_credential(uuid, text, text) from public, anon;
grant execute on function public.wpi_set_integration_credential(uuid, text, text) to authenticated;;
