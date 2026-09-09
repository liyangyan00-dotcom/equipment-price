create or replace function private.wpi_reconcile_stale_ai_gateway_runs()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  affected integer := 0;
begin
  update public.wpi_ai_gateway_runs
  set status = 'failed',
      error_code = 'AI_GATEWAY_RUN_STALE',
      error_message = 'AI 网关运行记录超过 30 分钟且未关联执行任务，系统已自动终结。',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where status = 'running'
    and execution_task_id is null
    and created_at < now() - interval '30 minutes';

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function private.wpi_reconcile_stale_ai_gateway_runs() from public;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'wpi-reconcile-stale-ai-gateway-runs'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'wpi-reconcile-stale-ai-gateway-runs',
  '*/10 * * * *',
  $cron$select private.wpi_reconcile_stale_ai_gateway_runs();$cron$
);

select private.wpi_reconcile_stale_ai_gateway_runs();

create temporary table wpi_affected_pricing_projects on commit drop as
select distinct item.project_id
from public.wpi_project_pricing_items item
left join public.wpi_equipment_prices equipment
  on item.price_source_type = 'equipment_price'
 and equipment.id = item.source_record_id
left join public.wpi_material_prices material
  on item.price_source_type = 'material_price'
 and material.id = item.source_record_id
where item.source_record_id is not null
  and coalesce(equipment.review_status::text, material.review_status::text, 'missing') <> 'approved';

update public.wpi_project_pricing_items item
set matched_unit_price = null,
    normalized_usd_price = null,
    price_source_type = 'unmatched',
    source_record_id = null,
    source_legacy_id = null,
    supplier_id = null,
    confidence = 0,
    match_level = 'unmatched',
    risk_level = 'high',
    needs_inquiry = true,
    decision_status = 'gap',
    evidence_count = 0,
    notes = trim(both from concat_ws('；', nullif(item.notes, ''), '原套价引用未审核价格，已自动撤销并转为询价缺口')),
    metadata = (coalesce(item.metadata, '{}'::jsonb) - 'supplierName') || jsonb_build_object(
      'requiresHumanReview', true,
      'currencyConversionStatus', 'not_applicable',
      'priceSourceInvalidatedAt', now(),
      'priceSourceInvalidationReason', 'SOURCE_PRICE_NOT_APPROVED'
    ),
    updated_at = now()
where item.project_id in (select project_id from wpi_affected_pricing_projects);

with summaries as (
  select
    item.project_id,
    count(*)::integer as total_items,
    count(*) filter (where item.matched_unit_price is not null)::integer as matched_items,
    count(*) filter (where item.needs_inquiry or item.match_level = 'unmatched')::integer as gap_items,
    count(*) filter (where item.risk_level in ('high', 'critical'))::integer as high_risk_items,
    round(coalesce(sum(coalesce(item.normalized_usd_price, 0) * item.quantity), 0), 2) as total_usd,
    round(coalesce(avg(item.confidence), 0), 1) as average_confidence
  from public.wpi_project_pricing_items item
  where item.project_id in (select project_id from wpi_affected_pricing_projects)
  group by item.project_id
)
update public.wpi_projects project
set pricing_result = coalesce(project.pricing_result, '{}'::jsonb) || jsonb_build_object(
      'totalItems', summary.total_items,
      'matchedItems', summary.matched_items,
      'gapItems', summary.gap_items,
      'highRiskItems', summary.high_risk_items,
      'totalUsd', summary.total_usd,
      'averageConfidence', summary.average_confidence,
      'requiresHumanReview', true,
      'pricedAt', now(),
      'reconciliationReason', 'SOURCE_PRICE_NOT_APPROVED'
    ),
    status = 'pending_review',
    risk_level = 'high',
    updated_at = now()
from summaries summary
where project.id = summary.project_id;


;
