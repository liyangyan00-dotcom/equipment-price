create table if not exists public.wpi_analytics_action_items (
  id uuid primary key default gen_random_uuid(),
  action_code text not null unique default (
    'ANA-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  action_key text not null check (action_key in ('risk-review', 'data-completeness', 'supplier-response', 'ai-failures')),
  object_type text not null check (object_type in ('all', 'equipment', 'material')),
  title text not null check (length(btrim(title)) between 1 and 300),
  priority text not null check (priority in ('P0', 'P1', 'P2')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  owner_role text not null check (length(btrim(owner_role)) between 1 and 80),
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date not null,
  impact text not null default '' check (length(impact) <= 1000),
  remediation_href text not null check (remediation_href like '/%' and length(remediation_href) <= 500),
  source_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(source_snapshot) = 'object'),
  created_by uuid not null references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, action_key, object_type),
  constraint wpi_analytics_action_resolution_check check (
    (status = 'resolved' and resolved_by is not null and resolved_at is not null)
    or (status <> 'resolved' and resolved_by is null and resolved_at is null)
  )
);

create index if not exists wpi_analytics_actions_org_status_due_idx
  on public.wpi_analytics_action_items (organization_id, status, due_date);
create index if not exists wpi_analytics_actions_assignee_idx
  on public.wpi_analytics_action_items (assigned_to, status)
  where assigned_to is not null;

drop trigger if exists wpi_analytics_action_items_updated_at on public.wpi_analytics_action_items;
create trigger wpi_analytics_action_items_updated_at
before update on public.wpi_analytics_action_items
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_analytics_action_items enable row level security;

drop policy if exists wpi_analytics_actions_read on public.wpi_analytics_action_items;
create policy wpi_analytics_actions_read
on public.wpi_analytics_action_items for select to authenticated
using (private.wpi_is_org_member(organization_id));

drop policy if exists wpi_analytics_actions_insert on public.wpi_analytics_action_items;
create policy wpi_analytics_actions_insert
on public.wpi_analytics_action_items for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.wpi_has_any_role(
    organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  )
);

drop policy if exists wpi_analytics_actions_update on public.wpi_analytics_action_items;
create policy wpi_analytics_actions_update
on public.wpi_analytics_action_items for update to authenticated
using (
  private.wpi_has_any_role(
    organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  )
)
with check (
  private.wpi_has_any_role(
    organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  )
);

revoke all on public.wpi_analytics_action_items from public, anon, authenticated;
grant select, insert, update on public.wpi_analytics_action_items to authenticated;
grant select, insert, update, delete on public.wpi_analytics_action_items to service_role;

comment on table public.wpi_analytics_action_items is
  'Persistent management actions created from analytics decision-readiness findings.';


