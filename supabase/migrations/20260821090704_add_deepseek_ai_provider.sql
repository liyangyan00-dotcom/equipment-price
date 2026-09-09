update public.wpi_integrations
set name = 'OpenAI 模型服务',
    provider = 'OpenAI',
    description = '通过 OpenAI API 为报价识别、价格推荐、BOQ 解析和报告生成提供模型能力。',
    endpoint_url = coalesce(nullif(endpoint_url, ''), 'https://api.openai.com/v1'),
    config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
      'model', coalesce(nullif(config ->> 'model', ''), 'gpt-5-mini'),
      'timeoutSeconds', coalesce((config ->> 'timeoutSeconds')::integer, 60),
      'humanReview', true
    )
where integration_code = 'OPENAI_COMPATIBLE'
  and integration_type = 'ai_provider'
  and is_system = true;

insert into public.wpi_integrations (
  organization_id,
  integration_code,
  integration_type,
  name,
  provider,
  description,
  endpoint_url,
  config,
  is_system,
  created_by
)
select
  organization.id,
  'DEEPSEEK',
  'ai_provider',
  'DeepSeek 模型服务',
  'DeepSeek',
  '通过 DeepSeek OpenAI-compatible API 提供价格分析、BOQ 解析、比价建议和报告生成能力。',
  'https://api.deepseek.com',
  jsonb_build_object(
    'model', 'deepseek-v4-flash',
    'timeoutSeconds', 90,
    'humanReview', true
  ),
  true,
  organization.created_by
from public.wpi_organizations organization
on conflict (organization_id, integration_code) do nothing;

;
