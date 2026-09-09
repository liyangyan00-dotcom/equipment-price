-- P2 continuous assurance: persist operational health, debounce incidents,
-- notify responsible roles, record recovery, and retain a 90-day trend.

create table public.wpi_automation_health_snapshots (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  overall_status text not null check (overall_status in ('healthy', 'degraded', 'critical')),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  workflows jsonb not null default '[]'::jsonb check (jsonb_typeof(workflows) = 'array'),
  integrations jsonb not null default '[]'::jsonb check (jsonb_typeof(integrations) = 'array'),
  cron_jobs jsonb not null default '[]'::jsonb check (jsonb_typeof(cron_jobs) = 'array'),
  collection jsonb not null default '{}'::jsonb check (jsonb_typeof(collection) = 'object'),
  state_fingerprint text not null,
  captured_at timestamptz not null default now()
);

create index wpi_automation_health_snapshots_org_captured_idx
  on public.wpi_automation_health_snapshots (organization_id, captured_at desc);
create index wpi_automation_health_snapshots_retention_idx
  on public.wpi_automation_health_snapshots (captured_at);

create table public.wpi_automation_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  incident_key text not null default 'automation-health',
  status text not null default 'open' check (status in ('open', 'resolved')),
  severity text not null check (severity in ('warning', 'critical')),
  title text not null,
  message text not null,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  resolved_at timestamptz,
  last_snapshot_id bigint references public.wpi_automation_health_snapshots(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_automation_incidents_resolution_check check (
    (status = 'open' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create unique index wpi_automation_incidents_one_open_idx
  on public.wpi_automation_incidents (organization_id, incident_key)
  where status = 'open';
create index wpi_automation_incidents_org_created_idx
  on public.wpi_automation_incidents (organization_id, created_at desc);

create trigger wpi_automation_incidents_updated_at
before update on public.wpi_automation_incidents
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_automation_health_snapshots enable row level security;
alter table public.wpi_automation_incidents enable row level security;

create policy wpi_automation_health_snapshots_read
on public.wpi_automation_health_snapshots
for select to authenticated
using (private.wpi_is_org_member(organization_id));

create policy wpi_automation_incidents_read
on public.wpi_automation_incidents
for select to authenticated
using (private.wpi_is_org_member(organization_id));

revoke all on public.wpi_automation_health_snapshots,
  public.wpi_automation_incidents from public, anon;
grant select on public.wpi_automation_health_snapshots,
  public.wpi_automation_incidents to authenticated;
grant select, insert, update, delete on public.wpi_automation_health_snapshots,
  public.wpi_automation_incidents to service_role;
grant usage, select on sequence public.wpi_automation_health_snapshots_id_seq
  to authenticated, service_role;

create or replace function private.wpi_capture_automation_health_snapshots()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row record;
  health jsonb;
  snapshot_id bigint;
  fingerprint text;
  recent_nonhealthy integer;
  recent_healthy integer;
  active_incident_id uuid;
  active_incident_severity text;
  opened_count integer := 0;
  updated_count integer := 0;
  resolved_count integer := 0;
  captured_count integer := 0;
  pruned_count integer := 0;
  incident_title text;
  incident_message text;
begin
  for organization_row in
    select organization.id
    from public.wpi_organizations organization
    where exists (
      select 1
      from public.wpi_organization_members member
      where member.organization_id = organization.id
        and member.is_active
    )
  loop
    health := public.wpi_get_ai_automation_health(organization_row.id);
    fingerprint := md5(jsonb_build_object(
      'status', health ->> 'overallStatus',
      'summary', health -> 'summary',
      'collection', health -> 'collection',
      'integrationErrors', (
        select coalesce(jsonb_agg(item ->> 'code' order by item ->> 'code'), '[]'::jsonb)
        from jsonb_array_elements(health -> 'integrations') item
        where item ->> 'status' = 'error'
      ),
      'blockedWorkflows', (
        select coalesce(jsonb_agg(item ->> 'workflowKey' order by item ->> 'workflowKey'), '[]'::jsonb)
        from jsonb_array_elements(health -> 'workflows') item
        where coalesce((item ->> 'ready')::boolean, false) is false
      )
    )::text);

    insert into public.wpi_automation_health_snapshots (
      organization_id,
      overall_status,
      summary,
      workflows,
      integrations,
      cron_jobs,
      collection,
      state_fingerprint
    ) values (
      organization_row.id,
      health ->> 'overallStatus',
      health -> 'summary',
      health -> 'workflows',
      health -> 'integrations',
      health -> 'cronJobs',
      health -> 'collection',
      fingerprint
    ) returning id into snapshot_id;
    captured_count := captured_count + 1;

    select
      count(*) filter (where sample.overall_status <> 'healthy')::integer,
      count(*) filter (where sample.overall_status = 'healthy')::integer
    into recent_nonhealthy, recent_healthy
    from (
      select snapshot.overall_status
      from public.wpi_automation_health_snapshots snapshot
      where snapshot.organization_id = organization_row.id
      order by snapshot.captured_at desc, snapshot.id desc
      limit 2
    ) sample;

    active_incident_id := null;
    active_incident_severity := null;

    select incident.id, incident.severity
    into active_incident_id, active_incident_severity
    from public.wpi_automation_incidents incident
    where incident.organization_id = organization_row.id
      and incident.incident_key = 'automation-health'
      and incident.status = 'open'
    order by incident.created_at desc
    limit 1;

    if health ->> 'overallStatus' = 'critical' or recent_nonhealthy = 2 then
      incident_title := case
        when health ->> 'overallStatus' = 'critical' then '自动化运行需要立即处理'
        else '自动化运行持续降级'
      end;
      incident_message := format(
        '工作流阻塞 %s 个，AI任务失败 %s 个，集成异常 %s 个，Cron失败 %s 个，来源失败 %s 个。',
        coalesce(health #>> '{summary,workflowBlocked}', '0'),
        coalesce(health #>> '{summary,failedTasks24h}', '0'),
        coalesce(health #>> '{summary,integrationErrors}', '0'),
        coalesce(health #>> '{summary,cronFailures24h}', '0'),
        coalesce(health #>> '{collection,failedSourceAttempts24h}', '0')
      );

      if active_incident_id is null then
        insert into public.wpi_automation_incidents (
          organization_id,
          severity,
          title,
          message,
          last_snapshot_id,
          metadata
        ) values (
          organization_row.id,
          case when health ->> 'overallStatus' = 'critical' then 'critical' else 'warning' end,
          incident_title,
          incident_message,
          snapshot_id,
          jsonb_build_object('fingerprint', fingerprint, 'health', health)
        ) returning id, severity into active_incident_id, active_incident_severity;
        opened_count := opened_count + 1;
      else
        update public.wpi_automation_incidents incident
        set severity = case when health ->> 'overallStatus' = 'critical' then 'critical' else incident.severity end,
            title = incident_title,
            message = incident_message,
            last_detected_at = now(),
            occurrence_count = incident.occurrence_count + 1,
            last_snapshot_id = snapshot_id,
            metadata = jsonb_build_object('fingerprint', fingerprint, 'health', health)
        where incident.id = active_incident_id
        returning id, severity into active_incident_id, active_incident_severity;
        updated_count := updated_count + 1;
      end if;

      insert into public.wpi_notifications (
        organization_id,
        recipient_id,
        dedupe_key,
        category,
        title,
        message,
        href,
        is_read,
        read_at,
        metadata
      )
      select
        organization_row.id,
        member.user_id,
        'automation:health-incident',
        'risk',
        incident_title,
        incident_message,
        '/ai-workbench',
        false,
        null,
        jsonb_build_object(
          'source', 'automation-assurance',
          'incidentId', active_incident_id,
          'severity', active_incident_severity,
          'snapshotId', snapshot_id
        )
      from public.wpi_organization_members member
      where member.organization_id = organization_row.id
        and member.is_active
        and member.role::text in ('admin', 'manager')
      on conflict (organization_id, recipient_id, dedupe_key)
      do update set
        category = excluded.category,
        title = excluded.title,
        message = excluded.message,
        href = excluded.href,
        is_read = false,
        read_at = null,
        metadata = excluded.metadata,
        updated_at = now();
    elsif active_incident_id is not null and recent_healthy = 2 then
      update public.wpi_automation_incidents incident
      set status = 'resolved',
          title = '自动化运行已恢复',
          message = '连续两次健康巡检通过，系统已自动关闭本次运行事件。',
          resolved_at = now(),
          last_snapshot_id = snapshot_id,
          metadata = incident.metadata || jsonb_build_object(
            'resolvedFingerprint', fingerprint,
            'resolvedSnapshotId', snapshot_id
          )
      where incident.id = active_incident_id;
      resolved_count := resolved_count + 1;

      update public.wpi_notifications notification
      set category = 'system',
          title = '自动化运行已恢复',
          message = '连续两次健康巡检通过，相关运行事件已自动关闭。',
          href = '/ai-workbench',
          is_read = false,
          read_at = null,
          metadata = notification.metadata || jsonb_build_object(
            'state', 'resolved',
            'resolvedSnapshotId', snapshot_id
          ),
          updated_at = now()
      where notification.organization_id = organization_row.id
        and notification.dedupe_key = 'automation:health-incident';
    end if;
  end loop;

  with pruned as (
    delete from public.wpi_automation_health_snapshots snapshot
    where snapshot.captured_at < now() - interval '90 days'
    returning 1
  )
  select count(*)::integer into pruned_count from pruned;

  return jsonb_build_object(
    'captured', captured_count,
    'incidentsOpened', opened_count,
    'incidentsUpdated', updated_count,
    'incidentsResolved', resolved_count,
    'snapshotsPruned', pruned_count
  );
end;
$$;

revoke all on function private.wpi_capture_automation_health_snapshots()
from public, anon, authenticated;
grant execute on function private.wpi_capture_automation_health_snapshots()
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
  $cron$select private.wpi_capture_automation_health_snapshots();$cron$
);

select private.wpi_capture_automation_health_snapshots();

comment on table public.wpi_automation_health_snapshots is
  'Fifteen-minute automation health snapshots retained for 90 days.';
comment on table public.wpi_automation_incidents is
  'Debounced automation incidents with automatic recovery closure and operator notifications.';


