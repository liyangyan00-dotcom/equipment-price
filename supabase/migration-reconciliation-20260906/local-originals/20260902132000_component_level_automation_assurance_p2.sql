create table public.wpi_automation_component_states (
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  component_key text not null,
  component_type text not null check (component_type in ('workflow', 'integration', 'cron', 'runtime')),
  label text not null,
  health_status text not null check (health_status in ('healthy', 'warning', 'critical')),
  message text,
  remediation_href text,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  consecutive_successes integer not null default 0 check (consecutive_successes >= 0),
  first_failed_at timestamptz,
  last_checked_at timestamptz not null default now(),
  last_changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  primary key (organization_id, component_key)
);

create index wpi_automation_component_states_status_idx
  on public.wpi_automation_component_states (organization_id, health_status, last_checked_at desc);

alter table public.wpi_automation_component_states enable row level security;

create policy wpi_automation_component_states_read
on public.wpi_automation_component_states
for select to authenticated
using (private.wpi_is_org_member(organization_id));

revoke all on public.wpi_automation_component_states from public, anon;
grant select on public.wpi_automation_component_states to authenticated;
grant select, insert, update, delete on public.wpi_automation_component_states to service_role;

create or replace function private.wpi_capture_automation_component_states()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row record;
  component_row record;
  previous_row public.wpi_automation_component_states;
  health jsonb;
  next_failures integer;
  next_successes integer;
  existing_incident_id uuid;
  opened_count integer := 0;
  updated_count integer := 0;
  resolved_count integer := 0;
  checked_count integer := 0;
begin
  for organization_row in
    select organization.id
    from public.wpi_organizations organization
    where exists (
      select 1 from public.wpi_organization_members member
      where member.organization_id = organization.id and member.is_active
    )
  loop
    health := public.wpi_get_ai_automation_health(organization_row.id);

    for component_row in
      select
        'workflow:' || (item ->> 'workflowKey') as component_key,
        'workflow' as component_type,
        item ->> 'label' as label,
        case when coalesce((item ->> 'ready')::boolean, false) then 'healthy' else 'critical' end as health_status,
        coalesce(item ->> 'blocker', '工作流配置与运行准入正常') as message,
        item ->> 'businessHref' as remediation_href,
        item as metadata
      from jsonb_array_elements(health -> 'workflows') item

      union all

      select
        'integration:' || (item ->> 'code'),
        'integration',
        item ->> 'name',
        case when item ->> 'status' = 'active' then 'healthy' else 'warning' end,
        coalesce(item ->> 'lastError', '外部集成连接正常'),
        '/settings/integrations?type=' || (case when item ->> 'type' = 'email' then 'email' else 'ai_provider' end),
        item
      from jsonb_array_elements(health -> 'integrations') item

      union all

      select
        'cron:' || (item ->> 'name'),
        'cron',
        item ->> 'name',
        case
          when coalesce((item ->> 'active')::boolean, false) is false then 'critical'
          when coalesce((item ->> 'failures24h')::integer, 0) > 0 then 'critical'
          when coalesce(item ->> 'lastStatus', 'missing') <> 'succeeded' then 'warning'
          else 'healthy'
        end,
        case
          when coalesce((item ->> 'active')::boolean, false) is false then '计划任务已停用'
          when coalesce((item ->> 'failures24h')::integer, 0) > 0 then '计划任务在 24 小时内存在失败'
          when coalesce(item ->> 'lastStatus', 'missing') <> 'succeeded' then '计划任务尚无成功运行记录'
          else '计划任务调度正常'
        end,
        '/ai-workbench',
        item
      from jsonb_array_elements(health -> 'cronJobs') item

      union all

      select
        'runtime:stale-ai-tasks', 'runtime', '陈旧 AI 任务',
        case when coalesce((health #>> '{summary,staleTasks}')::integer, 0) > 0 then 'critical' else 'healthy' end,
        case when coalesce((health #>> '{summary,staleTasks}')::integer, 0) > 0
          then format('%s 个 AI 任务超过 30 分钟未更新', health #>> '{summary,staleTasks}')
          else '没有陈旧 AI 任务' end,
        '/ai-workbench?status=running',
        jsonb_build_object('count', coalesce((health #>> '{summary,staleTasks}')::integer, 0))

      union all

      select
        'runtime:ai-task-failures', 'runtime', 'AI 任务失败',
        case when coalesce((health #>> '{summary,failedTasks24h}')::integer, 0) > 0 then 'warning' else 'healthy' end,
        case when coalesce((health #>> '{summary,failedTasks24h}')::integer, 0) > 0
          then format('24 小时内 %s 个 AI 任务失败', health #>> '{summary,failedTasks24h}')
          else '24 小时内没有 AI 任务失败' end,
        '/ai-workbench?status=needs_info',
        jsonb_build_object('count', coalesce((health #>> '{summary,failedTasks24h}')::integer, 0))

      union all

      select
        'runtime:collection-source-failures', 'runtime', '采集来源失败',
        case when coalesce((health #>> '{collection,failedSourceAttempts24h}')::integer, 0) > 0 then 'warning' else 'healthy' end,
        case when coalesce((health #>> '{collection,failedSourceAttempts24h}')::integer, 0) > 0
          then format('24 小时内 %s 个采集来源尝试失败', health #>> '{collection,failedSourceAttempts24h}')
          else '24 小时内没有采集来源失败' end,
        '/ai-price-collection',
        jsonb_build_object('count', coalesce((health #>> '{collection,failedSourceAttempts24h}')::integer, 0))
    loop
      select * into previous_row
      from public.wpi_automation_component_states state
      where state.organization_id = organization_row.id
        and state.component_key = component_row.component_key
      for update;

      next_failures := case when component_row.health_status = 'healthy' then 0 else coalesce(previous_row.consecutive_failures, 0) + 1 end;
      next_successes := case when component_row.health_status = 'healthy' then coalesce(previous_row.consecutive_successes, 0) + 1 else 0 end;

      insert into public.wpi_automation_component_states (
        organization_id, component_key, component_type, label, health_status,
        message, remediation_href, consecutive_failures, consecutive_successes,
        first_failed_at, last_checked_at, last_changed_at, metadata
      ) values (
        organization_row.id, component_row.component_key, component_row.component_type,
        component_row.label, component_row.health_status, component_row.message,
        component_row.remediation_href, next_failures, next_successes,
        case when component_row.health_status = 'healthy' then null else coalesce(previous_row.first_failed_at, now()) end,
        now(),
        case when previous_row.component_key is null or previous_row.health_status <> component_row.health_status then now() else previous_row.last_changed_at end,
        component_row.metadata
      )
      on conflict (organization_id, component_key) do update set
        component_type = excluded.component_type,
        label = excluded.label,
        health_status = excluded.health_status,
        message = excluded.message,
        remediation_href = excluded.remediation_href,
        consecutive_failures = excluded.consecutive_failures,
        consecutive_successes = excluded.consecutive_successes,
        first_failed_at = excluded.first_failed_at,
        last_checked_at = excluded.last_checked_at,
        last_changed_at = excluded.last_changed_at,
        metadata = excluded.metadata;
      checked_count := checked_count + 1;

      select incident.id into existing_incident_id
      from public.wpi_automation_incidents incident
      where incident.organization_id = organization_row.id
        and incident.incident_key = 'component:' || component_row.component_key
        and incident.status = 'open'
      limit 1;

      if component_row.health_status <> 'healthy' and next_failures >= 2 then
        if existing_incident_id is null then
          insert into public.wpi_automation_incidents (
            organization_id, incident_key, severity, title, message, metadata
          ) values (
            organization_row.id,
            'component:' || component_row.component_key,
            case when component_row.health_status = 'critical' then 'critical' else 'warning' end,
            component_row.label || '持续异常',
            component_row.message,
            jsonb_build_object(
              'componentKey', component_row.component_key,
              'componentType', component_row.component_type,
              'remediationHref', component_row.remediation_href,
              'consecutiveFailures', next_failures
            )
          );
          opened_count := opened_count + 1;
        else
          update public.wpi_automation_incidents incident
          set severity = case when component_row.health_status = 'critical' then 'critical' else incident.severity end,
              title = component_row.label || '持续异常',
              message = component_row.message,
              last_detected_at = now(),
              occurrence_count = incident.occurrence_count + 1,
              metadata = incident.metadata || jsonb_build_object(
                'remediationHref', component_row.remediation_href,
                'consecutiveFailures', next_failures
              )
          where incident.id = existing_incident_id;
          updated_count := updated_count + 1;
        end if;
      elsif component_row.health_status = 'healthy' and next_successes >= 2 and existing_incident_id is not null then
        update public.wpi_automation_incidents incident
        set status = 'resolved',
            title = component_row.label || '已恢复',
            message = '组件连续两次巡检正常，事件已自动关闭。',
            resolved_at = now(),
            metadata = incident.metadata || jsonb_build_object('consecutiveSuccesses', next_successes)
        where incident.id = existing_incident_id;
        resolved_count := resolved_count + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'componentsChecked', checked_count,
    'incidentsOpened', opened_count,
    'incidentsUpdated', updated_count,
    'incidentsResolved', resolved_count
  );
end;
$$;

revoke all on function private.wpi_capture_automation_component_states()
from public, anon, authenticated;
grant execute on function private.wpi_capture_automation_component_states()
to service_role;

create or replace function private.wpi_run_automation_assurance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_result jsonb;
  component_result jsonb;
begin
  snapshot_result := private.wpi_capture_automation_health_snapshots();
  component_result := private.wpi_capture_automation_component_states();
  return jsonb_build_object('snapshot', snapshot_result, 'components', component_result);
end;
$$;

revoke all on function private.wpi_run_automation_assurance()
from public, anon, authenticated;
grant execute on function private.wpi_run_automation_assurance()
to service_role;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'wpi-capture-automation-health'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'wpi-capture-automation-health',
  '*/15 * * * *',
  $cron$select private.wpi_run_automation_assurance();$cron$
);

select private.wpi_run_automation_assurance();

comment on table public.wpi_automation_component_states is
  'Component-level automation health with consecutive failure and recovery counters.';
