create table public.wpi_ai_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.wpi_organizations(id) on delete cascade,
  operation_mode text not null default 'balanced' check (operation_mode in ('conservative', 'balanced', 'aggressive')),
  auto_approve_threshold smallint not null default 92 check (auto_approve_threshold between 55 and 99),
  human_review_threshold smallint not null default 80 check (human_review_threshold between 1 and 98),
  price_deviation_threshold numeric(5,2) not null default 15 check (price_deviation_threshold between 0 and 100),
  boq_match_threshold smallint not null default 86 check (boq_match_threshold between 1 and 99),
  risk_alert_enabled boolean not null default true,
  mandatory_human_review boolean not null default true,
  config_version integer not null default 1 check (config_version > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_ai_settings_threshold_order check (human_review_threshold <= auto_approve_threshold)
);

create table public.wpi_ai_model_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  workflow_key text not null check (workflow_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null check (length(btrim(name)) between 1 and 100),
  provider text not null default 'unconfigured' check (length(btrim(provider)) between 1 and 100),
  model text not null default 'unconfigured' check (length(btrim(model)) between 1 and 120),
  mode text not null check (length(btrim(mode)) between 1 and 40),
  threshold smallint not null check (threshold between 1 and 99),
  description text not null default '' check (length(description) <= 500),
  is_enabled boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, workflow_key)
);

create table public.wpi_ai_risk_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  rule_key text not null check (rule_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  title text not null check (length(btrim(title)) between 1 and 100),
  condition_text text not null check (length(btrim(condition_text)) between 1 and 500),
  action_text text not null check (length(btrim(action_text)) between 1 and 500),
  severity text not null default 'high' check (severity in ('low', 'medium', 'high', 'critical')),
  is_enabled boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_key)
);

create table public.wpi_ai_review_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  policy_key text not null check (policy_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  title text not null check (length(btrim(title)) between 1 and 500),
  is_required boolean not null default true,
  is_enabled boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, policy_key)
);

create table public.wpi_ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  template_key text not null check (template_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null check (length(btrim(name)) between 1 and 100),
  version text not null check (length(btrim(version)) between 1 and 30),
  scope text not null check (length(btrim(scope)) between 1 and 300),
  content text not null check (length(btrim(content)) between 20 and 12000),
  is_enabled boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_key)
);

create table public.wpi_ai_task_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_key text not null check (task_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null check (length(btrim(name)) between 1 and 100),
  owner_name text not null check (length(btrim(owner_name)) between 1 and 100),
  is_enabled boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, task_key)
);

create index wpi_ai_model_configs_org_idx on public.wpi_ai_model_configs(organization_id, sort_order);
create index wpi_ai_risk_rules_org_idx on public.wpi_ai_risk_rules(organization_id, sort_order);
create index wpi_ai_review_policies_org_idx on public.wpi_ai_review_policies(organization_id, sort_order);
create index wpi_ai_prompt_templates_org_idx on public.wpi_ai_prompt_templates(organization_id, sort_order);
create index wpi_ai_task_configs_org_idx on public.wpi_ai_task_configs(organization_id, sort_order);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wpi_ai_settings',
    'wpi_ai_model_configs',
    'wpi_ai_risk_rules',
    'wpi_ai_review_policies',
    'wpi_ai_prompt_templates',
    'wpi_ai_task_configs'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.wpi_set_updated_at()',
      table_name || '_updated_at', table_name
    );
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.wpi_audit_row_change()',
      table_name || '_audit', table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.wpi_is_org_member(organization_id))',
      table_name || '_read', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.wpi_has_permission(organization_id, ''settings.manage'') and created_by = (select auth.uid()) and updated_by = (select auth.uid()))',
      table_name || '_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.wpi_has_permission(organization_id, ''settings.manage'')) with check (private.wpi_has_permission(organization_id, ''settings.manage'') and updated_by = (select auth.uid()))',
      table_name || '_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.wpi_has_permission(organization_id, ''settings.manage''))',
      table_name || '_delete', table_name
    );
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  end loop;
end $$;

create or replace function private.wpi_default_ai_settings_payload()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', jsonb_build_object(
      'operation_mode', 'balanced',
      'auto_approve_threshold', 92,
      'human_review_threshold', 80,
      'price_deviation_threshold', 15,
      'boq_match_threshold', 86,
      'risk_alert_enabled', true,
      'mandatory_human_review', true
    ),
    'models', jsonb_build_array(
      jsonb_build_object('key','quote_recognition','name','报价识别模型','provider','unconfigured','model','unconfigured','mode','稳健模式','threshold',88,'description','用于PDF、邮件与图片报价字段抽取','enabled',true,'sort_order',10),
      jsonb_build_object('key','boq_parsing','name','BOQ解析模型','provider','unconfigured','model','unconfigured','mode','高召回模式','threshold',82,'description','用于项目清单拆分、分类与价格匹配','enabled',true,'sort_order',20),
      jsonb_build_object('key','comparison_advice','name','比价建议模型','provider','unconfigured','model','unconfigured','mode','风险优先','threshold',86,'description','用于供应商报价差异和采用建议','enabled',true,'sort_order',30),
      jsonb_build_object('key','report_generation','name','报告生成模型','provider','unconfigured','model','unconfigured','mode','可解释模式','threshold',90,'description','用于生成结论、风险说明和证据引用','enabled',false,'sort_order',40)
    ),
    'risk_rules', jsonb_build_array(
      jsonb_build_object('key','abnormal_low_price','title','低价异常','condition','低于同类市场均价 20% 以上','action','标记高风险并要求人工说明','severity','high','enabled',true,'sort_order',10),
      jsonb_build_object('key','missing_parameters','title','参数缺失','condition','规格型号、有效期、来源任一缺失','action','进入人工复核并生成补全建议','severity','high','enabled',true,'sort_order',20),
      jsonb_build_object('key','supplier_risk','title','供应商风险','condition','供应商评分低于 70 或历史履约异常','action','建议更换供应商或补充证据','severity','high','enabled',true,'sort_order',30),
      jsonb_build_object('key','insufficient_evidence','title','证据链不足','condition','报价无原始文件或无联系人来源','action','限制进入正式价格库','severity','critical','enabled',true,'sort_order',40)
    ),
    'review_policies', jsonb_build_array(
      jsonb_build_object('key','low_confidence','title','AI置信度低于 80% 的报价结果必须人工复核','required',true,'enabled',true,'sort_order',10),
      jsonb_build_object('key','high_risk_pricing','title','高风险价格不得直接进入项目套价','required',true,'enabled',true,'sort_order',20),
      jsonb_build_object('key','supplier_qualification','title','供应商资质缺失时不得生成推荐采用结论','required',true,'enabled',true,'sort_order',30),
      jsonb_build_object('key','report_evidence','title','报告生成前必须完成缺失证据确认','required',true,'enabled',true,'sort_order',40)
    ),
    'prompts', jsonb_build_array(
      jsonb_build_object('key','quote_recognition','name','报价识别提示词','version','v2.6','scope','报价字段抽取与缺失字段判断','content','你是水厂价格情报系统的报价识别助手。提取报价字段，给出置信度、风险和缺失字段，不得替代人工商务判断。','enabled',true,'sort_order',10),
      jsonb_build_object('key','risk_assessment','name','风险判断提示词','version','v1.9','scope','价格异常、供应商风险、证据缺口','content','你是价格风险分析助手。基于来源、价格偏差、供应商和证据判断风险，输出可解释依据并要求必要的人工复核。','enabled',true,'sort_order',20),
      jsonb_build_object('key','inquiry_letter','name','询价函生成提示词','version','v2.1','scope','中英法多语言询价函','content','你是国际工程询价函助手。根据询价对象、供应商和商务边界生成专业草稿，明确缺失信息并保留人工确认。','enabled',true,'sort_order',30),
      jsonb_build_object('key','report_conclusion','name','报告结论提示词','version','v1.7','scope','AI结论、风险说明、商务建议','content','你是工程价格报告助手。仅基于已引用证据生成结论、风险与建议，所有商务采用结论必须由人工确认。','enabled',true,'sort_order',40)
    ),
    'tasks', jsonb_build_array(
      jsonb_build_object('key','quote_recognition','name','报价识别','owner','AI复核员','enabled',true,'sort_order',10),
      jsonb_build_object('key','price_collection','name','AI价格采集','owner','价格管理员','enabled',true,'sort_order',20),
      jsonb_build_object('key','comparison_analysis','name','AI比价分析','owner','商务预算组','enabled',true,'sort_order',30),
      jsonb_build_object('key','boq_parsing','name','BOQ解析','owner','项目套价组','enabled',true,'sort_order',40),
      jsonb_build_object('key','report_generation','name','报告生成','owner','报告管理员','enabled',false,'sort_order',50)
    )
  );
$$;

create or replace function public.wpi_save_ai_settings(
  target_organization_id uuid,
  settings_payload jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  config jsonb := settings_payload -> 'settings';
  next_version integer;
begin
  if actor is null or not private.wpi_has_permission(target_organization_id, 'settings.manage') then
    raise exception 'permission denied';
  end if;
  if jsonb_typeof(settings_payload) <> 'object'
    or jsonb_typeof(config) <> 'object'
    or jsonb_array_length(coalesce(settings_payload -> 'models', '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(settings_payload -> 'risk_rules', '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(settings_payload -> 'review_policies', '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(settings_payload -> 'prompts', '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(settings_payload -> 'tasks', '[]'::jsonb)) = 0 then
    raise exception 'invalid AI settings payload';
  end if;

  select coalesce(max(config_version), 0) + 1 into next_version
  from public.wpi_ai_settings where organization_id = target_organization_id;

  insert into public.wpi_ai_settings (
    organization_id, operation_mode, auto_approve_threshold, human_review_threshold,
    price_deviation_threshold, boq_match_threshold, risk_alert_enabled,
    mandatory_human_review, config_version, created_by, updated_by
  ) values (
    target_organization_id,
    coalesce(config ->> 'operation_mode', 'balanced'),
    coalesce((config ->> 'auto_approve_threshold')::smallint, 92),
    coalesce((config ->> 'human_review_threshold')::smallint, 80),
    coalesce((config ->> 'price_deviation_threshold')::numeric, 15),
    coalesce((config ->> 'boq_match_threshold')::smallint, 86),
    coalesce((config ->> 'risk_alert_enabled')::boolean, true),
    coalesce((config ->> 'mandatory_human_review')::boolean, true),
    next_version, actor, actor
  ) on conflict (organization_id) do update set
    operation_mode = excluded.operation_mode,
    auto_approve_threshold = excluded.auto_approve_threshold,
    human_review_threshold = excluded.human_review_threshold,
    price_deviation_threshold = excluded.price_deviation_threshold,
    boq_match_threshold = excluded.boq_match_threshold,
    risk_alert_enabled = excluded.risk_alert_enabled,
    mandatory_human_review = excluded.mandatory_human_review,
    config_version = excluded.config_version,
    updated_by = actor;

  insert into public.wpi_ai_model_configs (
    organization_id, workflow_key, name, provider, model, mode, threshold,
    description, is_enabled, sort_order, created_by, updated_by
  ) select target_organization_id, x.key, x.name, x.provider, x.model, x.mode,
    x.threshold, x.description, x.enabled, x.sort_order, actor, actor
  from jsonb_to_recordset(settings_payload -> 'models') as x(
    key text, name text, provider text, model text, mode text, threshold smallint,
    description text, enabled boolean, sort_order smallint
  ) on conflict (organization_id, workflow_key) do update set
    name=excluded.name, provider=excluded.provider, model=excluded.model, mode=excluded.mode,
    threshold=excluded.threshold, description=excluded.description,
    is_enabled=excluded.is_enabled, sort_order=excluded.sort_order, updated_by=actor;

  insert into public.wpi_ai_risk_rules (
    organization_id, rule_key, title, condition_text, action_text, severity,
    is_enabled, sort_order, created_by, updated_by
  ) select target_organization_id, x.key, x.title, x.condition, x.action, x.severity,
    x.enabled, x.sort_order, actor, actor
  from jsonb_to_recordset(settings_payload -> 'risk_rules') as x(
    key text, title text, condition text, action text, severity text,
    enabled boolean, sort_order smallint
  ) on conflict (organization_id, rule_key) do update set
    title=excluded.title, condition_text=excluded.condition_text, action_text=excluded.action_text,
    severity=excluded.severity, is_enabled=excluded.is_enabled,
    sort_order=excluded.sort_order, updated_by=actor;

  insert into public.wpi_ai_review_policies (
    organization_id, policy_key, title, is_required, is_enabled,
    sort_order, created_by, updated_by
  ) select target_organization_id, x.key, x.title, x.required, x.enabled,
    x.sort_order, actor, actor
  from jsonb_to_recordset(settings_payload -> 'review_policies') as x(
    key text, title text, required boolean, enabled boolean, sort_order smallint
  ) on conflict (organization_id, policy_key) do update set
    title=excluded.title, is_required=excluded.is_required, is_enabled=excluded.is_enabled,
    sort_order=excluded.sort_order, updated_by=actor;

  insert into public.wpi_ai_prompt_templates (
    organization_id, template_key, name, version, scope, content,
    is_enabled, sort_order, created_by, updated_by
  ) select target_organization_id, x.key, x.name, x.version, x.scope, x.content,
    x.enabled, x.sort_order, actor, actor
  from jsonb_to_recordset(settings_payload -> 'prompts') as x(
    key text, name text, version text, scope text, content text,
    enabled boolean, sort_order smallint
  ) on conflict (organization_id, template_key) do update set
    name=excluded.name, version=excluded.version, scope=excluded.scope,
    content=excluded.content, is_enabled=excluded.is_enabled,
    sort_order=excluded.sort_order, updated_by=actor;

  insert into public.wpi_ai_task_configs (
    organization_id, task_key, name, owner_name, is_enabled,
    sort_order, created_by, updated_by
  ) select target_organization_id, x.key, x.name, x.owner, x.enabled,
    x.sort_order, actor, actor
  from jsonb_to_recordset(settings_payload -> 'tasks') as x(
    key text, name text, owner text, enabled boolean, sort_order smallint
  ) on conflict (organization_id, task_key) do update set
    name=excluded.name, owner_name=excluded.owner_name, is_enabled=excluded.is_enabled,
    sort_order=excluded.sort_order, updated_by=actor;

  return next_version;
end;
$$;

create or replace function public.wpi_reset_ai_settings(target_organization_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return public.wpi_save_ai_settings(target_organization_id, private.wpi_default_ai_settings_payload());
end;
$$;

revoke all on function public.wpi_save_ai_settings(uuid, jsonb) from public, anon;
revoke all on function public.wpi_reset_ai_settings(uuid) from public, anon;
grant execute on function public.wpi_save_ai_settings(uuid, jsonb) to authenticated;
grant execute on function public.wpi_reset_ai_settings(uuid) to authenticated;

do $$
declare
  org record;
begin
  for org in select id, created_by from public.wpi_organizations loop
    perform set_config('request.jwt.claim.sub', org.created_by::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform public.wpi_save_ai_settings(org.id, private.wpi_default_ai_settings_payload());
  end loop;
end $$;

comment on table public.wpi_ai_settings is 'Organization-level AI governance thresholds and human-review boundaries.';
comment on table public.wpi_ai_prompt_templates is 'Versioned AI prompt configuration; provider credentials are managed separately through integrations and Vault.';
comment on function public.wpi_save_ai_settings(uuid, jsonb) is 'Atomically persists organization-scoped AI models, thresholds, rules, prompts and task switches with RLS and audit logging.';
