create or replace function private.wpi_list_price_reviewers_impl()
returns table (
  user_id uuid,
  display_name text,
  role text,
  is_current_user boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_org_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select member.organization_id
  into current_org_id
  from public.wpi_organization_members as member
  where member.user_id = current_user_id
    and member.is_active
  order by member.joined_at
  limit 1;

  if current_org_id is null
     or not private.wpi_has_permission(current_org_id, 'price.read') then
    raise exception 'Active organization membership is required';
  end if;

  return query
  select
    member.user_id,
    coalesce(nullif(profile.display_name, ''), '审核成员') as display_name,
    member.role::text,
    member.user_id = current_user_id
  from public.wpi_organization_members as member
  left join public.wpi_profiles as profile on profile.id = member.user_id
  where member.organization_id = current_org_id
    and member.is_active
    and member.role::text in ('admin', 'manager', 'reviewer')
  order by
    case member.role::text
      when 'admin' then 1
      when 'manager' then 2
      else 3
    end,
    coalesce(profile.display_name, ''),
    member.user_id;
end;
$$;

revoke all on function private.wpi_list_price_reviewers_impl()
  from public, anon, authenticated;
grant execute on function private.wpi_list_price_reviewers_impl()
  to authenticated;;
