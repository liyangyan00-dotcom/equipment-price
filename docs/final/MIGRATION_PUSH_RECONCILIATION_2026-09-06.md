# 推送前只读核对

日期：2026-09-06。云端项目：tkyvafheqyshbjqnzbgq。
未修改数据库、迁移文件、Git 索引或远端仓库。

## 已确认

- 本地活动迁移目录 170 个文件，云端 172 条历史。
- 按名称匹配有 35 个文件版本号不同；本地存在一个重复版本号。
- 20260901103000_standardize_talo_rebar_translations.sql 对应云端 20260831205249。
- 20260901103000_price_period_semantics.sql 对应云端 20260831213250。
- 上述两份 SQL 去除换行格式差异、首尾空白及末尾分号后与云端记录完全一致。均已部署，不应作为新迁移再次执行。
- 其余同名迁移仅完成版本对应核对，尚未逐份证明 SQL 一致。

## 非一对一历史

本地仅有名称：20260902090000_fix_agent_automation_p0.sql。
云端仅有以下名称：

- 20260901192915_fix_collection_run_hierarchy_p0
- 20260901193104_fix_formal_price_admission_p0
- 20260901195933_refine_ai_automation_operations_p1

前两条目的与本地合并 P0 文件相近，但云端完整 SQL 不是该文件的规范化原文子串，不能认定等价；第三条也未确认本地等价实现。须做内容差异审阅，不应按名称近似修复历史，也不能据此断言云端缺失功能。

## 排除项与依赖

- git check-ignore 确认 .env.local 已忽略。
- 旧构建缓存文件、.dev-3100.out.log、tmp/push-review-eslint.json 均未被 Git 忽略。
- .vercelignore 已排除旧构建和日志，但不控制 Git 暂存范围。
- 设置首页仍须连同真实认证、共享布局、API 和子页面闭合提交，不能只选颜色组件。
- 本轮未重新运行业务测试，已有结果见 PUSH_REVIEW_2026-09-06.md。未做干净构建或生产部署。

## 后续顺序

1. 补齐 Git 排除规则，不删除工作区文件。
2. 逐份比对下表 SQL，一致时以云端实际版本对齐本地历史并保留记录。
3. 拆清非一对一历史中的已部署内容与新增 SQL，暂不执行 db push 或 history repair。
4. 补齐测试依赖，在干净检出验证构建、权限及真实保存回读。
5. 完成文件白名单和暂存差异检查后，再确认推送。

## 同名异版本对应表

| 本地文件 | 云端实际版本 |
| --- | --- |
| 20260829220431_harden_price_collection_p0.sql | 20260829223722 |
| 20260831085901_price_collection_p1_workflow.sql | 20260831092151 |
| 20260831095804_fix_price_collection_cdf_fx_and_regional_dedup.sql | 20260831100218 |
| 20260831102008_harden_price_collection_schedule_and_audit.sql | 20260831102426 |
| 20260831105245_align_price_collection_next_run_to_schedule.sql | 20260831105517 |
| 20260831111118_price_collection_p1_operations.sql | 20260831111432 |
| 20260831120021_price_collection_p2_source_quality_category_schedule_security.sql | 20260831121728 |
| 20260831122213_fix_price_collection_schedule_policy_advisors.sql | 20260831122308 |
| 20260831180510_add_price_collection_task_archive.sql | 20260831181131 |
| 20260831182453_index_price_collection_task_archiver.sql | 20260831182536 |
| 20260901090000_fix_talo_rebar_diameter_translation.sql | 20260831161050 |
| 20260901103000_price_period_semantics.sql | 20260831213250 |
| 20260901103000_standardize_talo_rebar_translations.sql | 20260831205249 |
| 20260901143000_queue_caid_reports_for_parsing.sql | 20260831230352 |
| 20260901144500_restrict_caid_report_parse_queue.sql | 20260831230546 |
| 20260901150000_bound_caid_historical_backfill.sql | 20260831234752 |
| 20260901150207_monthly_price_dedup_identity.sql | 20260901151610 |
| 20260901154500_prevent_duplicate_price_collection_runs.sql | 20260901154353 |
| 20260901155000_advance_price_collection_schedule_after_run.sql | 20260901154925 |
| 20260901171713_preserve_collection_price_provenance.sql | 20260901172436 |
| 20260902103000_ai_automation_operations_p1.sql | 20260901195556 |
| 20260902120000_ai_automation_continuous_assurance_p2.sql | 20260902074807 |
| 20260902130000_close_agent_automation_p0.sql | 20260902084527 |
| 20260902130100_unify_collection_evidence_identity.sql | 20260902085152 |
| 20260902131100_automation_operations_information_p1.sql | 20260902090544 |
| 20260902131200_include_assurance_cron_in_operations_list.sql | 20260902090852 |
| 20260902132000_component_level_automation_assurance_p2.sql | 20260902092047 |
| 20260902132100_refine_component_assurance_states.sql | 20260902092323 |
| 20260902133000_exclude_running_cron_from_failures.sql | 20260902093741 |
| 20260902134000_automation_matrix_and_daily_smoke_assurance.sql | 20260902101807 |
| 20260902135000_attachment_review_queue_governance.sql | 20260902111946 |
| 20260902135100_register_attachment_governance_health.sql | 20260902115338 |
| 20260903090000_analytics_operational_assurance_p2.sql | 20260902160922 |
| 20260903094500_analytics_approved_health_scope_p0.sql | 20260902185636 |
| 20260903113000_analytics_decision_readiness_actions_p0.sql | 20260902193244 |
