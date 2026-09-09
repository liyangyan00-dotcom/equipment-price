-- P1 automation operations: one organization-scoped health snapshot for the
-- AI workbench. Historical task failures remain auditable without being
-- confused with the current workflow readiness state.

create or replace function public.wpi_get_ai_automation_health(
  target_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_role text;
  blocked_workflows integer := 0;
  stale_tasks integer := 0;
  failed_tasks_24h integer := 0;
  integration_errors integer := 0;
  cron_failures_24h integer := 0;
  overall_status text;
begin
  select member.role::text
  into member_role
  from public.wpi_organization_members member
  where member.organization_id = target_organization_id
    and member.user_id = auth.uid()
    and member.is_active;

  if member_role is null and auth.role() <> 'service_role' then
    raise exception 'ORGANIZATION_ACCESS_DENIED';
  end if;

  with workflow_map(workflow_key, label, model_key, prompt_key, business_href) as (
    values
      ('equipment_price_pre_review', '设备价格预审', 'comparison_advice', 'risk_assessment', '/equipment-prices/reviews'),
      ('quote_recognition', '报价识别', 'quote_recognition', 'quote_recognition', '/ai-quote-recognition'),
      ('price_collection', '价格采集', 'comparison_advice', 'risk_assessment', '/ai-price-collection'),
      ('comparison_analysis', '比价分析', 'comparison_advice', 'risk_assessment', '/inquiries'),
      ('boq_parsing', 'BOQ解析', 'boq_parsing', 'quote_recognition', '/project-pricing/boq-parse'),
      ('inquiry_letter', '询价函生成', 'comparison_advice', 'inquiry_letter', '/ai-inquiry-letter'),
      ('report_generation', '报告生成', 'report_generation', 'report_conclusion', '/ai-report-center')
  )
  select count(*)::integer
  into blocked_workflows
  from workflow_map workflow
  left join public.wpi_ai_settings settings
    on settings.organization_id = target_organization_id
  left join public.wpi_ai_model_configs model
    on model.organization_id = target_organization_id
   and model.workflow_key = workflow.model_key
  left join public.wpi_ai_prompt_templates prompt
    on prompt.organization_id = target_organization_id
   and prompt.template_key = workflow.prompt_key
  left join public.wpi_integrations integration
    on integration.organization_id = target_organization_id
   and integration.integration_type = 'ai_provider'
   and lower(integration.provider) = lower(model.provider)
  where coalesce(settings.mandatory_human_review, false) is false
     or coalesce(model.is_enabled, false) is false
     or coalesce(prompt.is_enabled, false) is false
     or coalesce(model.provider, 'unconfigured') = 'unconfigured'
     or coalesce(model.model, 'unconfigured') = 'unconfigured'
     or coalesce(integration.status, 'unconfigured') <> 'active'
     or coalesce(integration.credential_state, 'missing') <> 'configured';

  select
    count(*) filter (
      where status in ('queued', 'running')
        and updated_at < now() - interval '30 minutes'
    )::integer,
    count(*) filter (
      where status = 'failed'
        and created_at >= now() - interval '24 hours'
    )::integer
  into stale_tasks, failed_tasks_24h
  from public.wpi_ai_execution_tasks
  where organization_id = target_organization_id;

  select count(*)::integer
  into integration_errors
  from public.wpi_integrations
  where organization_id = target_organization_id
    and integration_type in ('ai_provider', 'email')
    and status = 'error';

  select count(*)::integer
  into cron_failures_24h
  from cron.job_run_details details
  join cron.job job on job.jobid = details.jobid
  where job.jobname in (
      'wpi-price-collection-due',
      'wpi-inquiry-reminders-due',
      'wpi-reconcile-stale-ai-gateway-runs'
    )
    and details.start_time >= now() - interval '24 hours'
    and details.status <> 'succeeded';

  overall_status := case
    when stale_tasks > 0 or cron_failures_24h > 0 then 'critical'
    when blocked_workflows > 0 or integration_errors > 0 or failed_tasks_24h > 0 then 'degraded'
    else 'healthy'
  end;

  return jsonb_build_object(
    'generatedAt', now(),
    'overallStatus', overall_status,
    'canManage', member_role in ('admin', 'manager') or auth.role() = 'service_role',
    'summary', jsonb_build_object(
      'workflowTotal', 7,
      'workflowReady', 7 - blocked_workflows,
      'workflowBlocked', blocked_workflows,
      'staleTasks', stale_tasks,
      'failedTasks24h', failed_tasks_24h,
      'integrationErrors', integration_errors,
      'cronFailures24h', cron_failures_24h
    ),
    'workflows', (
      with workflow_map(workflow_key, label, model_key, prompt_key, business_href) as (
        values
          ('equipment_price_pre_review', '设备价格预审', 'comparison_advice', 'risk_assessment', '/equipment-prices/reviews'),
          ('quote_recognition', '报价识别', 'quote_recognition', 'quote_recognition', '/ai-quote-recognition'),
          ('price_collection', '价格采集', 'comparison_advice', 'risk_assessment', '/ai-price-collection'),
          ('comparison_analysis', '比价分析', 'comparison_advice', 'risk_assessment', '/inquiries'),
          ('boq_parsing', 'BOQ解析', 'boq_parsing', 'quote_recognition', '/project-pricing/boq-parse'),
          ('inquiry_letter', '询价函生成', 'comparison_advice', 'inquiry_letter', '/ai-inquiry-letter'),
          ('report_generation', '报告生成', 'report_generation', 'report_conclusion', '/ai-report-center')
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'workflowKey', workflow.workflow_key,
        'label', workflow.label,
        'businessHref', workflow.business_href,
        'ready',
          coalesce(settings.mandatory_human_review, false)
          and coalesce(model.is_enabled, false)
          and coalesce(prompt.is_enabled, false)
          and coalesce(model.provider, 'unconfigured') <> 'unconfigured'
          and coalesce(model.model, 'unconfigured') <> 'unconfigured'
          and coalesce(integration.status, 'unconfigured') = 'active'
          and coalesce(integration.credential_state, 'missing') = 'configured',
        'provider', coalesce(model.provider, 'unconfigured'),
        'model', coalesce(model.model, 'unconfigured'),
        'promptEnabled', coalesce(prompt.is_enabled, false),
        'integrationStatus', coalesce(integration.status, 'unconfigured'),
        'credentialState', coalesce(integration.credential_state, 'missing'),
        'lastSuccessAt', integration.last_success_at,
        'blocker', case
          when coalesce(settings.mandatory_human_review, false) is false then '未启用强制人工复核'
          when coalesce(model.is_enabled, false) is false then '工作流模型未启用'
          when coalesce(prompt.is_enabled, false) is false then '提示词未启用'
          when coalesce(model.provider, 'unconfigured') = 'unconfigured' then '未配置 Provider'
          when coalesce(model.model, 'unconfigured') = 'unconfigured' then '未配置模型'
          when coalesce(integration.credential_state, 'missing') <> 'configured' then 'Provider 凭据未配置'
          when coalesce(integration.status, 'unconfigured') <> 'active' then 'Provider 尚未通过连通验证'
          else null
        end
      ) order by workflow.workflow_key), '[]'::jsonb)
      from workflow_map workflow
      left join public.wpi_ai_settings settings
        on settings.organization_id = target_organization_id
      left join public.wpi_ai_model_configs model
        on model.organization_id = target_organization_id
       and model.workflow_key = workflow.model_key
      left join public.wpi_ai_prompt_templates prompt
        on prompt.organization_id = target_organization_id
       and prompt.template_key = workflow.prompt_key
      left join public.wpi_integrations integration
        on integration.organization_id = target_organization_id
       and integration.integration_type = 'ai_provider'
       and lower(integration.provider) = lower(model.provider)
    ),
    'integrations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', integration.integration_code,
        'name', integration.name,
        'type', integration.integration_type,
        'provider', integration.provider,
        'status', integration.status,
        'credentialState', integration.credential_state,
        'lastValidatedAt', integration.last_validated_at,
        'lastSuccessAt', integration.last_success_at,
        'lastError', integration.last_error
      ) order by integration.integration_type, integration.name), '[]'::jsonb)
      from public.wpi_integrations integration
      where integration.organization_id = target_organization_id
        and integration.integration_type in ('ai_provider', 'email')
    ),
    'cronJobs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', job.jobname,
        'schedule', job.schedule,
        'active', job.active,
        'lastStatus', latest.status,
        'lastStartedAt', latest.start_time,
        'lastFinishedAt', latest.end_time,
        'runs24h', coalesce(day.runs, 0),
        'failures24h', coalesce(day.failures, 0)
      ) order by job.jobname), '[]'::jsonb)
      from cron.job job
      left join lateral (
        select details.status, details.start_time, details.end_time
        from cron.job_run_details details
        where details.jobid = job.jobid
        order by details.start_time desc
        limit 1
      ) latest on true
      left join lateral (
        select
          count(*)::integer as runs,
          count(*) filter (where details.status <> 'succeeded')::integer as failures
        from cron.job_run_details details
        where details.jobid = job.jobid
          and details.start_time >= now() - interval '24 hours'
      ) day on true
      where job.jobname in (
        'wpi-price-collection-due',
        'wpi-inquiry-reminders-due',
        'wpi-reconcile-stale-ai-gateway-runs'
      )
    ),
    'recentFailures', (
      select coalesce(jsonb_agg(failure order by failure.created_at desc), '[]'::jsonb)
      from (
        select
          task.id,
          task.task_code as "taskCode",
          task.workflow_key as "workflowKey",
          task.title,
          task.error_code as "errorCode",
          task.error_message as "errorMessage",
          task.attempt_count as "attemptCount",
          task.max_attempts as "maxAttempts",
          task.business_href as "businessHref",
          task.created_at
        from public.wpi_ai_execution_tasks task
        where task.organization_id = target_organization_id
          and task.status = 'failed'
        order by task.created_at desc
        limit 8
      ) failure
    ),
    'collection', (
      select jsonb_build_object(
        'activeParentRuns', count(*) filter (
          where run.run_kind = 'parent' and run.status in ('queued', 'running', 'partial')
        ),
        'failedParentRuns24h', count(*) filter (
          where run.run_kind = 'parent' and run.status = 'failed'
            and run.created_at >= now() - interval '24 hours'
        ),
        'failedSourceAttempts24h', count(*) filter (
          where run.run_kind = 'source_attempt' and run.status = 'failed'
            and run.created_at >= now() - interval '24 hours'
        )
      )
      from public.wpi_price_collection_runs run
      join public.wpi_price_collection_tasks task on task.id = run.task_id
      where task.organization_id = target_organization_id
    )
  );
end;
$$;

revoke all on function public.wpi_get_ai_automation_health(uuid)
from public, anon;
grant execute on function public.wpi_get_ai_automation_health(uuid)
to authenticated, service_role;

comment on function public.wpi_get_ai_automation_health(uuid) is
  'Organization-scoped operational snapshot for AI workflows, integrations, cron jobs, failures, and collection runs.';


