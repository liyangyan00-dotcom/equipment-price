create table public.wpi_organization_role_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  role public.wpi_app_role not null,
  permission public.wpi_app_permission not null,
  is_enabled boolean not null,
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, role, permission),
  constraint wpi_org_role_permission_admin_immutable check (role <> 'admin'::public.wpi_app_role)
);

create index wpi_org_role_permissions_org_role_idx
on public.wpi_organization_role_permissions (organization_id, role);

create trigger wpi_organization_role_permissions_updated_at
before update on public.wpi_organization_role_permissions
for each row execute function private.wpi_set_updated_at();

create trigger wpi_organization_role_permissions_audit
after insert or update or delete on public.wpi_organization_role_permissions
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_organization_role_permissions enable row level security;

create policy wpi_org_role_permissions_select_member
on public.wpi_organization_role_permissions
for select to authenticated
using (private.wpi_is_org_member(organization_id));

create policy wpi_org_role_permissions_insert_admin
on public.wpi_organization_role_permissions
for insert to authenticated
with check (
  role <> 'admin'::public.wpi_app_role
  and private.wpi_has_permission(organization_id, 'settings.manage')
  and updated_by = auth.uid()
);

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
  and updated_by = auth.uid()
);

create policy wpi_org_role_permissions_delete_admin
on public.wpi_organization_role_permissions
for delete to authenticated
using (
  role <> 'admin'::public.wpi_app_role
  and private.wpi_has_permission(organization_id, 'settings.manage')
);

grant select, insert, update, delete on public.wpi_organization_role_permissions to authenticated;
revoke all on public.wpi_organization_role_permissions from anon;

create or replace function private.wpi_has_permission(
  org uuid,
  perm public.wpi_app_permission
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.wpi_organization_members member
    where member.organization_id = org
      and member.user_id = auth.uid()
      and member.is_active
      and (
        member.role = 'admin'::public.wpi_app_role
        or coalesce(
          (
            select override.is_enabled
            from public.wpi_organization_role_permissions override
            where override.organization_id = member.organization_id
              and override.role = member.role
              and override.permission = perm
          ),
          exists (
            select 1
            from public.wpi_role_permissions role_permission
            where role_permission.role = member.role
              and role_permission.permission = perm
          )
        )
      )
  );
$$;

revoke all on function private.wpi_has_permission(uuid, public.wpi_app_permission) from public, anon;
grant execute on function private.wpi_has_permission(uuid, public.wpi_app_permission) to authenticated;

comment on table public.wpi_organization_role_permissions is
  'Organization-scoped overrides for the immutable default RBAC role permission templates.';
