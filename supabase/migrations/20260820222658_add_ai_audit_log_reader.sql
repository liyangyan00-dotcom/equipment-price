create or replace function public.wpi_get_ai_audit_runs(target_organization_id uuid)
returns table (
  run_id uuid,
  run_type text,
  object_id uuid,
  object_code text,
  object_name text,
  status text,
  provider text,
  model text,
  prompt_key text,
  prompt_version text,
  schema_version text,
  input_snapshot jsonb,
  output_payload jsonb,
  confidence numeric,
  risk_level text,
  requires_human_review boolean,
  human_decision text,
  human_note text,
  actor_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  duration_ms bigint,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if not private.wpi_is_org_member(target_organization_id)
     or not private.wpi_has_permission(target_organization_id, 'audit.read') then
    raise exception 'permission denied';
  end if;

  return query
  select *
  from (
    select
      ai_run.id as run_id,
      'equipment_review'::text as run_type,
      ai_run.equipment_price_id as object_id,
      equipment.price_code as object_code,
      equipment.equipment_name as object_name,
      ai_run.status,
      ai_run.provider,
      ai_run.model,
      ai_run.prompt_key,
      ai_run.prompt_version,
      ai_run.schema_version,
      ai_run.input_snapshot,
      coalesce(ai_run.output_payload, '{}'::jsonb) as output_payload,
      ai_run.confidence,
      coalesce(ai_run.risk_level::text, 'none') as risk_level,
      ai_run.requires_human_review,
      review.status::text as human_decision,
      review.review_comment as human_note,
      ai_run.requested_by as actor_id,
      ai_run.started_at,
      ai_run.completed_at,
      ai_run.created_at,
      case
        when ai_run.started_at is not null and ai_run.completed_at is not null
          then (extract(epoch from (ai_run.completed_at - ai_run.started_at)) * 1000)::bigint
        else null
      end as duration_ms,
      ai_run.error_code,
      ai_run.error_message
    from public.wpi_equipment_ai_review_runs ai_run
    left join public.wpi_equipment_prices equipment on equipment.id = ai_run.equipment_price_id
    left join public.wpi_equipment_price_reviews review on review.id = ai_run.review_id
    where ai_run.organization_id = target_organization_id

    union all

    select
      ai_run.id as run_id,
      'attachment_evidence'::text as run_type,
      ai_run.attachment_id as object_id,
      attachment.attachment_code as object_code,
      attachment.original_name as object_name,
      ai_run.status,
      ai_run.provider,
      ai_run.model,
      'attachment_evidence_extract'::text as prompt_key,
      coalesce(ai_run.output_payload ->> 'promptVersion', 'evidence-v1') as prompt_version,
      coalesce(ai_run.output_payload ->> 'schemaVersion', 'attachment-v1') as schema_version,
      ai_run.input_snapshot,
      coalesce(ai_run.output_payload, '{}'::jsonb) as output_payload,
      ai_run.confidence,
      coalesce(ai_run.risk_level::text, 'none') as risk_level,
      ai_run.requires_human_review,
      latest_review.decision as human_decision,
      latest_review.notes as human_note,
      ai_run.requested_by as actor_id,
      ai_run.started_at,
      ai_run.completed_at,
      ai_run.created_at,
      case
        when ai_run.started_at is not null and ai_run.completed_at is not null
          then (extract(epoch from (ai_run.completed_at - ai_run.started_at)) * 1000)::bigint
        else null
      end as duration_ms,
      case when ai_run.status = 'failed' then 'ATTACHMENT_AI_FAILED' else null end as error_code,
      case when ai_run.status = 'failed' then coalesce(ai_run.output_payload ->> 'error', '附件证据分析失败') else null end as error_message
    from public.wpi_attachment_ai_runs ai_run
    left join public.wpi_attachments attachment on attachment.id = ai_run.attachment_id
    left join lateral (
      select attachment_review.decision, attachment_review.notes
      from public.wpi_attachment_reviews attachment_review
      where attachment_review.attachment_id = ai_run.attachment_id
      order by attachment_review.created_at desc
      limit 1
    ) latest_review on true
    where ai_run.organization_id = target_organization_id

    union all

    select
      collection_task.id as run_id,
      'price_collection'::text as run_type,
      collection_task.id as object_id,
      collection_task.task_code as object_code,
      coalesce(nullif(collection_task.keyword, ''), '价格采集任务') as object_name,
      collection_task.status,
      collection_task.provider,
      'price-collection-workflow'::text as model,
      'price_collection'::text as prompt_key,
      coalesce(collection_task.config ->> 'promptVersion', 'workflow-v1') as prompt_version,
      'price-lead-v1'::text as schema_version,
      jsonb_build_object(
        'targetType', collection_task.target_type,
        'keyword', collection_task.keyword,
        'specification', collection_task.specification,
        'region', collection_task.region,
        'currency', collection_task.currency,
        'sourceType', collection_task.source_type,
        'frequency', collection_task.frequency,
        'config', collection_task.config
      ) as input_snapshot,
      jsonb_build_object(
        'progress', collection_task.progress,
        'currentSource', collection_task.current_source,
        'successCount', collection_task.success_count,
        'failedCount', collection_task.failed_count
      ) as output_payload,
      null::numeric as confidence,
      case when collection_task.last_error is not null then 'high' else 'none' end as risk_level,
      coalesce((collection_task.config ->> 'humanReview')::boolean, true) as requires_human_review,
      case
        when collection_task.status in ('completed', 'transferred') then 'completed'
        when collection_task.status in ('needs_review', 'reviewing') then 'pending_review'
        else null
      end as human_decision,
      null::text as human_note,
      collection_task.created_by as actor_id,
      collection_task.started_at,
      collection_task.finished_at as completed_at,
      collection_task.created_at,
      case
        when collection_task.started_at is not null and collection_task.finished_at is not null
          then (extract(epoch from (collection_task.finished_at - collection_task.started_at)) * 1000)::bigint
        else null
      end as duration_ms,
      case when collection_task.last_error is not null then 'PRICE_COLLECTION_FAILED' else null end as error_code,
      collection_task.last_error as error_message
    from public.wpi_price_collection_tasks collection_task
    where collection_task.organization_id = target_organization_id
  ) audit_run
  order by audit_run.created_at desc
  limit 1000;
end;
$$;

revoke all on function public.wpi_get_ai_audit_runs(uuid) from public, anon;
grant execute on function public.wpi_get_ai_audit_runs(uuid) to authenticated;

comment on function public.wpi_get_ai_audit_runs(uuid) is
  'Returns organization-scoped AI execution evidence to authenticated members with audit.read permission.';;
