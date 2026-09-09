create table public.wpi_automation_smoke_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  workflow_key text not null check (workflow_key in (
    'equipment_price_pre_review', 'quote_recognition', 'price_collection',
    'comparison_analysis', 'boq_parsing', 'inquiry_letter', 'report_generation'
  )),
  fixture_label text not null,
  enabled boolean not null default true,
  max_age_hours integer not null default 168 check (max_age_hours between 1 and 720),
  require_human_review boolean not null default true,
  require_formal_write boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, workflow_key)
);

create table public.wpi_automation_smoke_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  case_id uuid not null references public.wpi_automation_smoke_cases(id) on delete cascade,
  workflow_key text not null,
  result_status text not null check (result_status in ('passed', 'failed')),
  failed_stage text check (failed_stage in ('configuration', 'latest_run', 'human_review', 'formal_write')),
  message text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  executed_at timestamptz not null default now()
);

create index wpi_automation_smoke_runs_lookup_idx
  on public.wpi_automation_smoke_runs (organization_id, workflow_key, executed_at desc);

alter table public.wpi_automation_smoke_cases enable row level security;
alter table public.wpi_automation_smoke_runs enable row level security;

create policy wpi_automation_smoke_cases_read
on public.wpi_automation_smoke_cases for select to authenticated
using (private.wpi_is_org_member(organization_id));

create policy wpi_automation_smoke_runs_read
on public.wpi_automation_smoke_runs for select to authenticated
using (private.wpi_is_org_member(organization_id));

revoke all on public.wpi_automation_smoke_cases from public, anon;
revoke all on public.wpi_automation_smoke_runs from public, anon;
grant select on public.wpi_automation_smoke_cases to authenticated;
grant select on public.wpi_automation_smoke_runs to authenticated;
grant select, insert, update, delete on public.wpi_automation_smoke_cases to service_role;
grant select, insert, update, delete on public.wpi_automation_smoke_runs to service_role;

insert into public.wpi_automation_smoke_cases (organization_id, workflow_key, fixture_label)
select organization.id, workflow.workflow_key, workflow.fixture_label
from public.wpi_organizations organization
cross join (values
  ('equipment_price_pre_review', '最近设备价格预审样本'),
  ('quote_recognition', '最近报价或来源文件识别样本'),
  ('price_collection', '最近价格采集样本'),
  ('comparison_analysis', '最近询价比价样本'),
  ('boq_parsing', '最近 BOQ 解析样本'),
  ('inquiry_letter', '最近询价函样本'),
  ('report_generation', '最近报告生成样本')
) workflow(workflow_key, fixture_label)
on conflict (organization_id, workflow_key) do nothing;

create or replace function public.wpi_get_ai_automation_matrix(target_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_role text;
  health jsonb;
  workflow jsonb;
  current_workflow_key text;
  latest_status text;
  latest_at timestamptz;
  review_count integer;
  review_at timestamptz;
  formal_count integer;
  formal_at timestamptz;
  smoke_status text;
  smoke_at timestamptz;
  smoke_message text;
  matrix jsonb := '[]'::jsonb;
begin
  select member.role::text into member_role
  from public.wpi_organization_members member
  where member.organization_id = target_organization_id
    and member.user_id = auth.uid()
    and member.is_active;

  if member_role is null and auth.role() <> 'service_role' then
    raise exception 'ORGANIZATION_ACCESS_DENIED';
  end if;

  health := public.wpi_get_ai_automation_health(target_organization_id);

  for workflow in select value from jsonb_array_elements(health -> 'workflows')
  loop
    current_workflow_key := workflow ->> 'workflowKey';
    latest_status := null;
    latest_at := null;
    review_count := 0;
    review_at := null;
    formal_count := 0;
    formal_at := null;

    if current_workflow_key = 'equipment_price_pre_review' then
      select run.status, run.created_at into latest_status, latest_at
      from public.wpi_equipment_ai_review_runs run
      where run.organization_id = target_organization_id
      order by run.created_at desc limit 1;
      select count(*)::integer, max(review.reviewed_at) into review_count, review_at
      from public.wpi_equipment_price_reviews review
      where review.organization_id = target_organization_id and review.reviewed_at is not null;
      select count(*)::integer, max(review.reviewed_at) into formal_count, formal_at
      from public.wpi_equipment_price_reviews review
      where review.organization_id = target_organization_id and review.status::text = 'approved';
    elsif current_workflow_key = 'quote_recognition' then
      select run.status, run.created_at into latest_status, latest_at
      from public.wpi_ai_gateway_runs run
      where run.organization_id = target_organization_id and run.workflow_key = current_workflow_key
      order by run.created_at desc limit 1;
      select count(*)::integer, max(item.reviewed_at) into review_count, review_at
      from public.wpi_quote_items item
      where item.organization_id = target_organization_id and item.reviewed_at is not null;
      select count(*)::integer, max(item.reviewed_at) into formal_count, formal_at
      from public.wpi_quote_items item
      where item.organization_id = target_organization_id
        and (item.target_material_price_id is not null or item.target_equipment_price_id is not null);
    elsif current_workflow_key = 'price_collection' then
      select run.status, run.created_at into latest_status, latest_at
      from public.wpi_price_collection_runs run
      where run.organization_id = target_organization_id and run.run_kind = 'parent'
      order by run.created_at desc limit 1;
      select count(*)::integer, max(lead.reviewed_at) into review_count, review_at
      from public.wpi_price_collection_leads lead
      where lead.organization_id = target_organization_id and lead.reviewed_at is not null;
      select count(*)::integer, max(lead.transferred_at) into formal_count, formal_at
      from public.wpi_price_collection_leads lead
      where lead.organization_id = target_organization_id and lead.transferred_at is not null;
    else
      select task.status, task.created_at into latest_status, latest_at
      from public.wpi_ai_execution_tasks task
      where task.organization_id = target_organization_id and task.workflow_key = current_workflow_key
      order by task.created_at desc limit 1;
      select count(*)::integer, max(task.reviewed_at) into review_count, review_at
      from public.wpi_ai_execution_tasks task
      where task.organization_id = target_organization_id
        and task.workflow_key = current_workflow_key and task.reviewed_at is not null;

      if current_workflow_key = 'comparison_analysis' then
        select count(*)::integer, max(comparison.updated_at) into formal_count, formal_at
        from public.wpi_comparisons comparison
        where comparison.organization_id = target_organization_id
          and comparison.status::text in ('approved', 'completed', 'confirmed');
      elsif current_workflow_key = 'boq_parsing' then
        select count(*)::integer, max(item.updated_at) into formal_count, formal_at
        from public.wpi_project_pricing_items item
        join public.wpi_projects project on project.id = item.project_id
        where item.organization_id = target_organization_id
          and project.metadata ? 'aiBoqTaskId'
          and item.decision_status in ('confirmed', 'approved');
      elsif current_workflow_key = 'inquiry_letter' then
        select count(*)::integer, max(event.created_at) into formal_count, formal_at
        from public.wpi_inquiry_events event
        where event.organization_id = target_organization_id
          and event.event_status in ('completed', 'sent', 'delivered', 'opened', 'replied');
      elsif current_workflow_key = 'report_generation' then
        select count(*)::integer, max(report.updated_at) into formal_count, formal_at
        from public.wpi_reports report
        where report.organization_id = target_organization_id
          and report.status::text in ('approved', 'published', 'completed');
      end if;
    end if;

    select run.result_status, run.executed_at, run.message
    into smoke_status, smoke_at, smoke_message
    from public.wpi_automation_smoke_runs run
    where run.organization_id = target_organization_id and run.workflow_key = current_workflow_key
    order by run.executed_at desc limit 1;

    matrix := matrix || jsonb_build_array(jsonb_build_object(
      'workflowKey', current_workflow_key,
      'configuration', jsonb_build_object(
        'status', case when coalesce((workflow ->> 'ready')::boolean, false) then 'passed' else 'blocked' end,
        'label', case when coalesce((workflow ->> 'ready')::boolean, false) then '已就绪' else '配置阻塞' end,
        'detail', coalesce(workflow ->> 'blocker', (workflow ->> 'provider') || ' / ' || (workflow ->> 'model'))
      ),
      'latestRun', jsonb_build_object(
        'status', case
          when latest_status is null then 'not_run'
          when latest_status in ('completed', 'needs_review', 'approved', 'partial') then 'passed'
          when latest_status in ('queued', 'running') then 'pending'
          else 'failed' end,
        'label', coalesce(latest_status, '尚未运行'), 'at', latest_at
      ),
      'humanReview', jsonb_build_object(
        'status', case when review_count > 0 then 'passed' when latest_status is null then 'not_run' else 'pending' end,
        'label', case when review_count > 0 then '已完成人工审核' when latest_status is null then '暂无待审结果' else '等待人工审核' end,
        'count', review_count, 'at', review_at
      ),
      'formalWrite', jsonb_build_object(
        'status', case when formal_count > 0 then 'passed' when latest_status is null then 'not_run' else 'pending' end,
        'label', case when formal_count > 0 then '已形成业务结果' when latest_status is null then '尚无可落库结果' else '尚未形成业务结果' end,
        'count', formal_count, 'at', formal_at
      ),
      'smoke', jsonb_build_object(
        'status', coalesce(smoke_status, 'not_run'),
        'label', case when smoke_status = 'passed' then '冒烟通过' when smoke_status = 'failed' then '冒烟失败' else '等待首次冒烟' end,
        'at', smoke_at, 'message', smoke_message
      )
    ));
  end loop;

  return jsonb_build_object(
    'generatedAt', now(),
    'schedule', '每天 10:15（北京时间）',
    'workflows', matrix
  );
end;
$$;

revoke all on function public.wpi_get_ai_automation_matrix(uuid) from public, anon;
grant execute on function public.wpi_get_ai_automation_matrix(uuid) to authenticated, service_role;

create or replace function private.wpi_run_daily_automation_smokes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row record;
  smoke_case public.wpi_automation_smoke_cases;
  workflow jsonb;
  matrix jsonb;
  failed_stage text;
  result_status text;
  result_message text;
  previous_state public.wpi_automation_component_states;
  next_failures integer;
  next_successes integer;
  incident_id uuid;
  checked_count integer := 0;
  passed_count integer := 0;
  failed_count integer := 0;
begin
  for organization_row in
    select organization.id from public.wpi_organizations organization
    where exists (
      select 1 from public.wpi_organization_members member
      where member.organization_id = organization.id and member.is_active
    )
  loop
    insert into public.wpi_automation_smoke_cases (organization_id, workflow_key, fixture_label)
    select organization_row.id, workflow_key, fixture_label
    from (values
      ('equipment_price_pre_review', '最近设备价格预审样本'),
      ('quote_recognition', '最近报价或来源文件识别样本'),
      ('price_collection', '最近价格采集样本'),
      ('comparison_analysis', '最近询价比价样本'),
      ('boq_parsing', '最近 BOQ 解析样本'),
      ('inquiry_letter', '最近询价函样本'),
      ('report_generation', '最近报告生成样本')
    ) fixture(workflow_key, fixture_label)
    on conflict (organization_id, workflow_key) do nothing;

    matrix := public.wpi_get_ai_automation_matrix(organization_row.id);

    for smoke_case in
      select * from public.wpi_automation_smoke_cases candidate
      where candidate.organization_id = organization_row.id and candidate.enabled
      order by candidate.workflow_key
    loop
      select item into workflow
      from jsonb_array_elements(matrix -> 'workflows') item
      where item ->> 'workflowKey' = smoke_case.workflow_key;

      failed_stage := null;
      if workflow #>> '{configuration,status}' <> 'passed' then
        failed_stage := 'configuration';
      elsif workflow #>> '{latestRun,status}' <> 'passed'
        or coalesce(
          (workflow #>> '{latestRun,at}')::timestamptz < now() - make_interval(hours => smoke_case.max_age_hours),
          true
        ) then
        failed_stage := 'latest_run';
      elsif smoke_case.require_human_review and workflow #>> '{humanReview,status}' <> 'passed' then
        failed_stage := 'human_review';
      elsif smoke_case.require_formal_write and workflow #>> '{formalWrite,status}' <> 'passed' then
        failed_stage := 'formal_write';
      end if;

      result_status := case when failed_stage is null then 'passed' else 'failed' end;
      result_message := case failed_stage
        when 'configuration' then '运行配置未就绪'
        when 'latest_run' then format('最近 %s 小时内没有成功业务运行', smoke_case.max_age_hours)
        when 'human_review' then '样本尚未完成人工审核'
        when 'formal_write' then '样本尚未形成正式业务结果'
        else '配置、运行、人工审核和正式落库四阶段均通过' end;

      insert into public.wpi_automation_smoke_runs (
        organization_id, case_id, workflow_key, result_status,
        failed_stage, message, details
      ) values (
        organization_row.id, smoke_case.id, smoke_case.workflow_key,
        result_status, failed_stage, result_message, workflow
      );

      select * into previous_state
      from public.wpi_automation_component_states state
      where state.organization_id = organization_row.id
        and state.component_key = 'smoke:' || smoke_case.workflow_key
      for update;

      next_failures := case when result_status = 'passed' then 0 else coalesce(previous_state.consecutive_failures, 0) + 1 end;
      next_successes := case when result_status = 'passed' then coalesce(previous_state.consecutive_successes, 0) + 1 else 0 end;

      insert into public.wpi_automation_component_states (
        organization_id, component_key, component_type, label, health_status,
        message, remediation_href, consecutive_failures, consecutive_successes,
        first_failed_at, last_checked_at, last_changed_at, metadata
      ) values (
        organization_row.id, 'smoke:' || smoke_case.workflow_key, 'workflow',
        smoke_case.fixture_label,
        case when result_status = 'passed' then 'healthy' else 'warning' end,
        result_message, '/ai-workbench', next_failures, next_successes,
        case when result_status = 'passed' then null else coalesce(previous_state.first_failed_at, now()) end,
        now(),
        case when previous_state.component_key is null
          or previous_state.health_status <> case when result_status = 'passed' then 'healthy' else 'warning' end
          then now() else previous_state.last_changed_at end,
        jsonb_build_object('workflowKey', smoke_case.workflow_key, 'failedStage', failed_stage)
      )
      on conflict (organization_id, component_key) do update set
        health_status = excluded.health_status,
        message = excluded.message,
        consecutive_failures = excluded.consecutive_failures,
        consecutive_successes = excluded.consecutive_successes,
        first_failed_at = excluded.first_failed_at,
        last_checked_at = excluded.last_checked_at,
        last_changed_at = excluded.last_changed_at,
        metadata = excluded.metadata;

      select incident.id into incident_id
      from public.wpi_automation_incidents incident
      where incident.organization_id = organization_row.id
        and incident.incident_key = 'smoke:' || smoke_case.workflow_key
        and incident.status = 'open'
      limit 1;

      if result_status = 'failed' and next_failures >= 2 then
        if incident_id is null then
          insert into public.wpi_automation_incidents (
            organization_id, incident_key, severity, title, message, metadata
          ) values (
            organization_row.id, 'smoke:' || smoke_case.workflow_key, 'warning',
            smoke_case.fixture_label || '连续失败', result_message,
            jsonb_build_object('workflowKey', smoke_case.workflow_key, 'failedStage', failed_stage, 'remediationHref', '/ai-workbench')
          );
        else
          update public.wpi_automation_incidents incident
          set message = result_message,
              last_detected_at = now(),
              occurrence_count = incident.occurrence_count + 1,
              metadata = incident.metadata || jsonb_build_object('failedStage', failed_stage, 'consecutiveFailures', next_failures)
          where incident.id = incident_id;
        end if;
      elsif result_status = 'passed' and next_successes >= 2 and incident_id is not null then
        update public.wpi_automation_incidents incident
        set status = 'resolved', title = smoke_case.fixture_label || '已恢复',
            message = '每日冒烟连续两次通过，事件已自动关闭。',
            resolved_at = now(),
            metadata = incident.metadata || jsonb_build_object('consecutiveSuccesses', next_successes)
        where incident.id = incident_id;
      end if;

      checked_count := checked_count + 1;
      if result_status = 'passed' then passed_count := passed_count + 1; else failed_count := failed_count + 1; end if;
    end loop;
  end loop;

  delete from public.wpi_automation_smoke_runs where executed_at < now() - interval '90 days';
  return jsonb_build_object('checked', checked_count, 'passed', passed_count, 'failed', failed_count);
end;
$$;

revoke all on function private.wpi_run_daily_automation_smokes() from public, anon, authenticated;
grant execute on function private.wpi_run_daily_automation_smokes() to service_role;

do $migration$
declare
  function_definition text;
  updated_definition text;
  old_jobs text := $jobs$'wpi-price-collection-due',
        'wpi-inquiry-reminders-due',
        'wpi-reconcile-stale-ai-gateway-runs',
        'wpi-capture-automation-health'$jobs$;
  new_jobs text := $jobs$'wpi-price-collection-due',
        'wpi-inquiry-reminders-due',
        'wpi-reconcile-stale-ai-gateway-runs',
        'wpi-capture-automation-health',
        'wpi-daily-automation-smoke'$jobs$;
begin
  select pg_get_functiondef('public.wpi_get_ai_automation_health(uuid)'::regprocedure)
  into function_definition;
  updated_definition := replace(function_definition, old_jobs, new_jobs);
  if updated_definition = function_definition then
    raise exception 'Unable to add daily smoke cron to automation health';
  end if;
  execute updated_definition;
end;
$migration$;

do $$
declare existing_job record;
begin
  for existing_job in select jobid from cron.job where jobname = 'wpi-daily-automation-smoke'
  loop perform cron.unschedule(existing_job.jobid); end loop;
end;
$$;

select cron.schedule(
  'wpi-daily-automation-smoke',
  '15 2 * * *',
  $cron$select private.wpi_run_daily_automation_smokes();$cron$
);

select private.wpi_run_daily_automation_smokes();

comment on function public.wpi_get_ai_automation_matrix(uuid) is
  'Four-stage automation matrix backed by real configuration, execution, human review, and formal business outcomes.';
comment on function private.wpi_run_daily_automation_smokes() is
  'Runs seven non-destructive daily workflow smoke checks; opens incidents after two failures and resolves after two successes.';
