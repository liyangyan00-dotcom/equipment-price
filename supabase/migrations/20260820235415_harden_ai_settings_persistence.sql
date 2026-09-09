-- Cover audit actor foreign keys used by deletes, audit queries, and organization cleanup.
create index if not exists wpi_ai_settings_created_by_idx
  on public.wpi_ai_settings(created_by);
create index if not exists wpi_ai_settings_updated_by_idx
  on public.wpi_ai_settings(updated_by);

create index if not exists wpi_ai_model_configs_created_by_idx
  on public.wpi_ai_model_configs(created_by);
create index if not exists wpi_ai_model_configs_updated_by_idx
  on public.wpi_ai_model_configs(updated_by);

create index if not exists wpi_ai_risk_rules_created_by_idx
  on public.wpi_ai_risk_rules(created_by);
create index if not exists wpi_ai_risk_rules_updated_by_idx
  on public.wpi_ai_risk_rules(updated_by);

create index if not exists wpi_ai_review_policies_created_by_idx
  on public.wpi_ai_review_policies(created_by);
create index if not exists wpi_ai_review_policies_updated_by_idx
  on public.wpi_ai_review_policies(updated_by);

create index if not exists wpi_ai_prompt_templates_created_by_idx
  on public.wpi_ai_prompt_templates(created_by);
create index if not exists wpi_ai_prompt_templates_updated_by_idx
  on public.wpi_ai_prompt_templates(updated_by);

create index if not exists wpi_ai_task_configs_created_by_idx
  on public.wpi_ai_task_configs(created_by);
create index if not exists wpi_ai_task_configs_updated_by_idx
  on public.wpi_ai_task_configs(updated_by);

-- The reset RPC needs this helper, but anonymous callers must never invoke it.
revoke all on function private.wpi_default_ai_settings_payload() from public, anon;
grant execute on function private.wpi_default_ai_settings_payload() to authenticated, service_role;

;
