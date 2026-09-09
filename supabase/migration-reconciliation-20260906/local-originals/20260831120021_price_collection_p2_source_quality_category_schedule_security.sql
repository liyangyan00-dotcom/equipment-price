-- P2: source quality observability, category-level schedules, legacy RPC retirement,
-- and a first pass over obsolete SECURITY DEFINER exposure.

alter table public.wpi_price_collection_tasks
  add column if not exists schedule_category text;

create or replace function private.wpi_price_collection_category(
  target_type text,
  keyword text
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when lower(coalesce(target_type, 'equipment')) = 'material' and coalesce(keyword, '') ~* '(水泥|cement)' then 'material.cement'
    when lower(coalesce(target_type, 'equipment')) = 'material' and coalesce(keyword, '') ~* '(钢|steel|螺纹)' then 'material.steel'
    when lower(coalesce(target_type, 'equipment')) = 'material' and coalesce(keyword, '') ~* '(砂|石|aggregate|gravel)' then 'material.aggregate'
    when lower(coalesce(target_type, 'equipment')) = 'material' then 'material.other'
    when coalesce(keyword, '') ~* '(泵|pump)' then 'equipment.pump'
    when coalesce(keyword, '') ~* '(阀|valve)' then 'equipment.valve'
    when coalesce(keyword, '') ~* '(仪表|流量计|meter|instrument)' then 'equipment.instrument'
    else 'equipment.other'
  end;
$$;

update public.wpi_price_collection_tasks
set schedule_category = private.wpi_price_collection_category(target_type, keyword)
where schedule_category is null;

alter table public.wpi_price_collection_tasks
  alter column schedule_category set not null,
  alter column schedule_category set default 'equipment.other';

create or replace function private.wpi_set_price_collection_category()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.schedule_category := private.wpi_price_collection_category(new.target_type, new.keyword);
  return new;
end;
$$;

create trigger wpi_price_collection_tasks_category
before insert or update of target_type, keyword on public.wpi_price_collection_tasks
for each row execute function private.wpi_set_price_collection_category();

create index if not exists wpi_price_collection_tasks_schedule_category_idx
  on public.wpi_price_collection_tasks (organization_id, schedule_category, schedule_enabled);

create table if not exists public.wpi_price_collection_schedule_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  category_key text not null,
  category_label text not null,
  target_type text not null check (target_type in ('equipment', 'material')),
  frequency text not null check (frequency in ('每小时', '每天', '每周', '每月')),
  schedule_expression text not null,
  timezone text not null default 'Asia/Shanghai',
  is_active boolean not null default true,
  last_applied_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, category_key)
);

create trigger wpi_price_collection_schedule_policies_updated_at
before update on public.wpi_price_collection_schedule_policies
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_price_collection_schedule_policies enable row level security;

create policy wpi_price_collection_schedule_policies_read
on public.wpi_price_collection_schedule_policies
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_price_collection_schedule_policies_write
on public.wpi_price_collection_schedule_policies
for all to authenticated
using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));

revoke all on public.wpi_price_collection_schedule_policies from public, anon;
grant select, insert, update, delete on public.wpi_price_collection_schedule_policies to authenticated;
grant select, insert, update, delete on public.wpi_price_collection_schedule_policies to service_role;

insert into public.wpi_price_collection_schedule_policies (
  organization_id, category_key, category_label, target_type, frequency, schedule_expression
)
select organization.id, defaults.category_key, defaults.category_label,
       defaults.target_type, defaults.frequency, defaults.schedule_expression
from public.wpi_organizations organization
cross join (values
  ('equipment.pump', '泵类设备', 'equipment', '每天', '0 2 * * *'),
  ('equipment.valve', '阀门设备', 'equipment', '每周', '0 2 * * 1'),
  ('equipment.instrument', '仪表设备', 'equipment', '每周', '0 2 * * 1'),
  ('equipment.other', '其他设备', 'equipment', '每月', '0 2 1 * *'),
  ('material.cement', '水泥', 'material', '每天', '0 2 * * *'),
  ('material.steel', '钢材', 'material', '每周', '0 2 * * 1'),
  ('material.aggregate', '砂石骨料', 'material', '每周', '0 2 * * 1'),
  ('material.other', '其他地材', 'material', '每月', '0 2 1 * *')
) as defaults(category_key, category_label, target_type, frequency, schedule_expression)
on conflict (organization_id, category_key) do nothing;

create or replace function private.wpi_collection_next_run(
  frequency text,
  from_time timestamptz default now()
)
returns timestamptz
language sql
stable
parallel safe
set search_path = ''
as $$
  select case lower(coalesce(frequency, 'manual'))
    when 'hourly' then date_trunc('hour', from_time) + interval '1 hour'
    when '每小时' then date_trunc('hour', from_time) + interval '1 hour'
    when 'daily' then date_trunc('day', from_time) + interval '1 day 2 hours'
    when '每天' then date_trunc('day', from_time) + interval '1 day 2 hours'
    when 'weekly' then date_trunc('week', from_time) + interval '1 week 2 hours'
    when '每周' then date_trunc('week', from_time) + interval '1 week 2 hours'
    when 'monthly' then date_trunc('month', from_time) + interval '1 month 2 hours'
    when '每月' then date_trunc('month', from_time) + interval '1 month 2 hours'
    else null
  end;
$$;

update public.wpi_price_collection_tasks task
set frequency = policy.frequency,
    schedule_expression = policy.schedule_expression,
    next_run_at = private.wpi_collection_next_run(policy.frequency, now()),
    updated_at = now()
from public.wpi_price_collection_schedule_policies policy
where task.organization_id = policy.organization_id
  and task.schedule_category = policy.category_key
  and task.schedule_enabled
  and task.collection_mode in ('web', 'api')
  and policy.is_active;

create or replace function public.wpi_apply_price_collection_schedule_policy(
  target_policy_id uuid,
  policy_frequency text,
  policy_active boolean default true
)
returns public.wpi_price_collection_schedule_policies
language plpgsql
security invoker
set search_path = ''
as $$
declare
  policy_row public.wpi_price_collection_schedule_policies;
  next_expression text;
begin
  next_expression := case policy_frequency
    when '每小时' then '0 * * * *'
    when '每天' then '0 2 * * *'
    when '每周' then '0 2 * * 1'
    when '每月' then '0 2 1 * *'
    else null
  end;
  if next_expression is null then
    raise exception 'Unsupported collection frequency';
  end if;

  update public.wpi_price_collection_schedule_policies
  set frequency = policy_frequency,
      schedule_expression = next_expression,
      is_active = policy_active,
      last_applied_at = now(),
      updated_by = auth.uid()
  where id = target_policy_id
  returning * into policy_row;

  if policy_row.id is null then
    raise exception 'Schedule policy not found or not writable';
  end if;

  update public.wpi_price_collection_tasks
  set frequency = case when policy_active then policy_frequency else '仅本次' end,
      schedule_enabled = policy_active,
      schedule_expression = case when policy_active then next_expression else null end,
      next_run_at = case when policy_active
        then private.wpi_collection_next_run(policy_frequency, now()) else null end,
      updated_by = auth.uid(),
      updated_at = now()
  where organization_id = policy_row.organization_id
    and schedule_category = policy_row.category_key
    and collection_mode in ('web', 'api');

  return policy_row;
end;
$$;

revoke all on function public.wpi_apply_price_collection_schedule_policy(uuid, text, boolean)
from public, anon;
grant execute on function public.wpi_apply_price_collection_schedule_policy(uuid, text, boolean)
to authenticated, service_role;

create or replace view public.wpi_price_collection_source_quality_metrics
with (security_invoker = true)
as
with run_metrics as (
  select source_run.organization_id,
         source_run.source_id,
         max(source_run.source_name) as source_name,
         count(*)::integer as run_count,
         count(*) filter (where source_run.status in ('failed', 'partial'))::integer as failed_run_count,
         coalesce(sum(source_run.created_lead_count), 0)::integer as new_count,
         coalesce(sum(source_run.updated_lead_count), 0)::integer as updated_count,
         coalesce(sum(source_run.duplicate_count), 0)::integer as duplicate_count,
         max(source_run.finished_at) as last_run_at
  from public.wpi_price_collection_source_runs source_run
  where source_run.created_at >= now() - interval '30 days'
  group by source_run.organization_id, source_run.source_id
), lead_metrics as (
  select lead.organization_id,
         lead.source_id,
         count(*)::integer as retained_lead_count,
         count(*) filter (
           where lead.price_validity_status = 'valid'
             and lead.price is not null and lead.price > 0
         )::integer as valid_price_count
  from public.wpi_price_collection_leads lead
  where lead.source_id is not null
    and coalesce(lead.last_seen_at, lead.source_checked_at, lead.updated_at) >= now() - interval '30 days'
  group by lead.organization_id, lead.source_id
)
select run_metrics.organization_id,
       run_metrics.source_id,
       run_metrics.source_name,
       run_metrics.run_count,
       run_metrics.failed_run_count,
       run_metrics.new_count,
       run_metrics.updated_count,
       run_metrics.duplicate_count,
       coalesce(lead_metrics.retained_lead_count, 0) as retained_lead_count,
       coalesce(lead_metrics.valid_price_count, 0) as valid_price_count,
       round(100.0 * run_metrics.new_count /
         nullif(run_metrics.new_count + run_metrics.updated_count + run_metrics.duplicate_count, 0), 1) as new_rate,
       round(100.0 * run_metrics.updated_count /
         nullif(run_metrics.new_count + run_metrics.updated_count + run_metrics.duplicate_count, 0), 1) as update_rate,
       round(100.0 * run_metrics.duplicate_count /
         nullif(run_metrics.new_count + run_metrics.updated_count + run_metrics.duplicate_count, 0), 1) as duplicate_rate,
       round(100.0 * coalesce(lead_metrics.valid_price_count, 0) /
         nullif(coalesce(lead_metrics.retained_lead_count, 0), 0), 1) as valid_price_rate,
       run_metrics.last_run_at
from run_metrics
left join lead_metrics
  on lead_metrics.organization_id = run_metrics.organization_id
 and lead_metrics.source_id = run_metrics.source_id;

revoke all on public.wpi_price_collection_source_quality_metrics from public, anon;
grant select on public.wpi_price_collection_source_quality_metrics to authenticated, service_role;

-- v4 has been the only application caller through the P1 stabilization window.
drop function if exists public.wpi_search_price_collection_leads_v3(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, integer, integer
);

-- This legacy audit RPC has no application caller. Keep it service-only until its
-- audit table is retired; this removes unnecessary end-user definer exposure.
revoke all on function public.wpi_record_equipment_access_event(uuid, text, jsonb)
from public, anon, authenticated;
grant execute on function public.wpi_record_equipment_access_event(uuid, text, jsonb)
to service_role;
