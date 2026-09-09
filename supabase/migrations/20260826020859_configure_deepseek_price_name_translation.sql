insert into public.wpi_ai_model_configs (
  organization_id,
  workflow_key,
  name,
  provider,
  model,
  mode,
  threshold,
  description,
  is_enabled,
  sort_order,
  created_by,
  updated_by
)
select
  integration.organization_id,
  'price_name_translation',
  '价格名称双语翻译',
  integration.integration_code,
  coalesce(nullif(integration.config ->> 'model', ''), 'deepseek-chat'),
  'bilingual_review',
  85,
  '保留原文并生成简体中文候选名称，所有结果进入人工审核。',
  true,
  35,
  existing.created_by,
  existing.updated_by
from public.wpi_integrations integration
join public.wpi_ai_model_configs existing
  on existing.organization_id = integration.organization_id
 and existing.workflow_key = 'comparison_advice'
where integration.integration_type = 'ai_provider'
  and integration.integration_code = 'DEEPSEEK'
  and integration.status = 'active'
  and integration.credential_state = 'configured'
on conflict (organization_id, workflow_key) do update
set provider = excluded.provider,
    model = excluded.model,
    mode = excluded.mode,
    threshold = excluded.threshold,
    description = excluded.description,
    is_enabled = true,
    updated_by = excluded.updated_by,
    updated_at = now();

;
