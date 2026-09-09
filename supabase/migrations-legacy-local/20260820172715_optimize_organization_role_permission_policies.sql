create index wpi_org_role_permissions_updated_by_idx
on public.wpi_organization_role_permissions (updated_by);

drop policy if exists wpi_org_role_permissions_insert_admin
on public.wpi_organization_role_permissions;

create policy wpi_org_role_permissions_insert_admin
on public.wpi_organization_role_permissions
for insert to authenticated
with check (
  role <> 'admin'::public.wpi_app_role
  and private.wpi_has_permission(organization_id, 'settings.manage')
  and updated_by = (select auth.uid())
);

drop policy if exists wpi_org_role_permissions_update_admin
on public.wpi_organization_role_permissions;

create policy wpi_org_role_permissions_update_admin
on public.wpi_organization_role_permissions
for update to authenticated
using (
  role <> 'admin'::public.wpi_app_role
  and private.wpi_has_permission(organization_id, 'settings.manage')
)
with check (
  role <> 'admin'::public.wpi_app_role
  and private.wpi_has_permission(organization_id, 'settings.manage')
  and updated_by = (select auth.uid())
);
