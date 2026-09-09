-- P2 analytics assurance: monitor inventory freshness and price-date quality,
-- debounce incidents, notify operators, and close incidents after recovery.

create or replace function private.wpi_capture_analytics_health()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row record;
  previous_row public.wpi_automation_component_states;
  total_count integer;
  recent_count integer;
  fallback_count integer;
  latest_record_at timestamptz;
  next_status text;
  next_message text;
  next_failures integer;
  next_successes integer;
  existing_incident_id uuid;
  checked_count integer := 0;
  opened_count integer := 0;
  updated_count integer := 0;
  resolved_count integer := 0;
begin
  for organization_row in
    select organization.id
    from public.wpi_organizations organization
    where exists (
      select 1 from public.wpi_organization_members member
      where member.organization_id = organization.id and member.is_active
    )
  loop
    select
      count(*)::integer,
      count(*) filter (where price.created_at >= now() - interval '30 days')::integer,
      count(*) filter (where nullif(price.metadata ->> 'quoteDate', '') is null)::integer,
      max(greatest(price.created_at, coalesce(price.updated_at, price.created_at)))
    into total_count, recent_count, fallback_count, latest_record_at
    from (
      select equipment.created_at, equipment.updated_at, equipment.metadata
      from public.wpi_equipment_prices equipment
      where equipment.organization_id = organization_row.id
        and equipment.deleted_at is null
      union all
      select material.created_at, material.updated_at, material.metadata
      from public.wpi_material_prices material
      where material.organization_id = organization_row.id
    ) price;

    next_status := case
      when total_count = 0 then 'critical'
      when latest_record_at is null or latest_record_at < now() - interval '90 days' then 'critical'
      when recent_count = 0 then 'warning'
      when fallback_count::numeric / greatest(total_count, 1) > 0.20 then 'warning'
      else 'healthy'
    end;
    next_message := case
      when total_count = 0 then '正式价格库为空，统计分析无法形成有效结论'
      when latest_record_at is null or latest_record_at < now() - interval '90 days' then '正式价格超过 90 天未更新'
      when recent_count = 0 then '近 30 天没有正式价格更新'
      when fallback_count::numeric / greatest(total_count, 1) > 0.20 then format('%s 条价格缺少价格日期，超过 20%% 质量阈值', fallback_count)
      else format('统计数据正常：正式价格 %s 条，近 30 天更新 %s 条', total_count, recent_count)
    end;

    select * into previous_row
    from public.wpi_automation_component_states state
    where state.organization_id = organization_row.id
      and state.component_key = 'runtime:analytics-aggregation'
    for update;

    next_failures := case when next_status = 'healthy' then 0 else coalesce(previous_row.consecutive_failures, 0) + 1 end;
    next_successes := case when next_status = 'healthy' then coalesce(previous_row.consecutive_successes, 0) + 1 else 0 end;

    insert into public.wpi_automation_component_states (
      organization_id, component_key, component_type, label, health_status,
      message, remediation_href, consecutive_failures, consecutive_successes,
      first_failed_at, last_checked_at, last_changed_at, metadata
    ) values (
      organization_row.id, 'runtime:analytics-aggregation', 'runtime', '统计分析数据质量', next_status,
      next_message, '/analytics', next_failures, next_successes,
      case when next_status = 'healthy' then null else coalesce(previous_row.first_failed_at, now()) end,
      now(),
      case when previous_row.component_key is null or previous_row.health_status <> next_status then now() else previous_row.last_changed_at end,
      jsonb_build_object(
        'totalPriceCount', total_count,
        'recentPriceCount30d', recent_count,
        'fallbackDateCount', fallback_count,
        'fallbackDateRatio', round(fallback_count::numeric / greatest(total_count, 1) * 100, 1),
        'latestRecordAt', latest_record_at,
        'checkedAt', now()
      )
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
      and incident.incident_key = 'component:runtime:analytics-aggregation'
      and incident.status = 'open'
    limit 1;

    if next_status <> 'healthy' and next_failures >= 2 then
      if existing_incident_id is null then
        insert into public.wpi_automation_incidents (
          organization_id, incident_key, severity, title, message, metadata
        ) values (
          organization_row.id, 'component:runtime:analytics-aggregation',
          case when next_status = 'critical' then 'critical' else 'warning' end,
          '统计分析数据质量持续异常', next_message,
          jsonb_build_object('componentKey', 'runtime:analytics-aggregation', 'remediationHref', '/analytics', 'consecutiveFailures', next_failures)
        ) returning id into existing_incident_id;
        opened_count := opened_count + 1;
      else
        update public.wpi_automation_incidents incident
        set severity = case when next_status = 'critical' then 'critical' else incident.severity end,
            message = next_message,
            last_detected_at = now(),
            occurrence_count = incident.occurrence_count + 1,
            metadata = incident.metadata || jsonb_build_object('consecutiveFailures', next_failures)
        where incident.id = existing_incident_id;
        updated_count := updated_count + 1;
      end if;

      insert into public.wpi_notifications (
        organization_id, recipient_id, dedupe_key, category, title, message,
        href, is_read, read_at, metadata
      )
      select organization_row.id, member.user_id, 'analytics:health-incident', 'risk',
        '统计分析数据质量持续异常', next_message, '/analytics', false, null,
        jsonb_build_object('incidentId', existing_incident_id, 'componentKey', 'runtime:analytics-aggregation')
      from public.wpi_organization_members member
      where member.organization_id = organization_row.id
        and member.is_active
        and member.role::text in ('admin', 'manager')
      on conflict (organization_id, recipient_id, dedupe_key) do update set
        category = excluded.category, title = excluded.title, message = excluded.message,
        href = excluded.href, is_read = false, read_at = null,
        metadata = excluded.metadata, updated_at = now();
    elsif next_status = 'healthy' and next_successes >= 2 and existing_incident_id is not null then
      update public.wpi_automation_incidents incident
      set status = 'resolved', title = '统计分析数据质量已恢复',
          message = '连续两次巡检正常，事件已自动关闭。', resolved_at = now(),
          metadata = incident.metadata || jsonb_build_object('consecutiveSuccesses', next_successes)
      where incident.id = existing_incident_id;
      resolved_count := resolved_count + 1;

      update public.wpi_notifications notification
      set category = 'system', title = '统计分析数据质量已恢复',
          message = '连续两次巡检正常，相关事件已自动关闭。',
          is_read = false, read_at = null,
          metadata = notification.metadata || jsonb_build_object('state', 'resolved'),
          updated_at = now()
      where notification.organization_id = organization_row.id
        and notification.dedupe_key = 'analytics:health-incident';
    end if;
  end loop;

  return jsonb_build_object(
    'componentsChecked', checked_count,
    'incidentsOpened', opened_count,
    'incidentsUpdated', updated_count,
    'incidentsResolved', resolved_count
  );
end;
$$;

revoke all on function private.wpi_capture_analytics_health() from public, anon, authenticated;
grant execute on function private.wpi_capture_analytics_health() to service_role;

create or replace function private.wpi_run_automation_assurance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_result jsonb;
  component_result jsonb;
  analytics_result jsonb;
begin
  snapshot_result := private.wpi_capture_automation_health_snapshots();
  component_result := private.wpi_capture_automation_component_states();
  analytics_result := private.wpi_capture_analytics_health();
  return jsonb_build_object('snapshot', snapshot_result, 'components', component_result, 'analytics', analytics_result);
end;
$$;

revoke all on function private.wpi_run_automation_assurance() from public, anon, authenticated;
grant execute on function private.wpi_run_automation_assurance() to service_role;

select private.wpi_capture_analytics_health();

comment on function private.wpi_capture_analytics_health() is
  'Monitors analytics price freshness and date completeness with two-run incident debounce and recovery closure.';


