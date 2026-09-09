# 附件 API / RPC / 字段保护修复

本轮承接 `ATTACHMENT_REVIEW_PERMISSION_AUDIT_2026-09-06.md`，用户已解除暂停开发限制。已完成本地修复和持续行为回归；数据库迁移登记为 pending，未连接或修改云端业务数据。R03 的目标环境发布验收尚未关闭。

## 修复内容

1. API、审核员候选列表、审核/分派 RPC 共享数据库有效权限判定：同组织有效 admin / manager / reviewer 加 `price.review`。editor 仅有 file.write 不能确认、驳回或写审核决定；组织权限覆盖撤销后立即影响下一次请求；viewer/editor 的权限覆盖不能突破审核角色限制。
2. 审核历史只允许受控 RPC 写入。公开 RPC 改为 security invoker 包装，特权实现位于 private schema，固定空 search_path、收回 PUBLIC/anon 执行权限，使用 auth.uid() 校验实际调用者。合法审核人、时间和审核记录由数据库同事务生成。
3. 新增 security invoker 字段保护触发器，阻止 authenticated（包括业务 admin）直接 INSERT/UPDATE 审核终态、审核人、审核时间、分派身份、证据版本、重复指针和保留审核元数据。组织、记录 ID、上传人、创建时间、附件编号不可在 UPDATE 中改写。判断数据库执行角色，不使用客户端可设置的会话标记作为 RPC 授权证明。
4. 证据变化递增 evidence_version，清理旧审核元数据、确认身份和 AI 状态；必须重新预审。确认时校验当前版本 AI、原始文件指纹、真实同组织业务关联、未解决问题、重复证据和高风险说明。抽取字段修改保留人工编辑能力，并通过 updated_at 条件防止覆盖竞争更新。
5. 分派预先锁定全部附件并验证所有 ID；跨组织、缺失、终态或无效接收人会整批回滚。失权接收人可由合法管理者重新分派。冻结设备证据同时检查旧、新业务关联，防止改挂业务对象绕过冻结。

## 持久回归

- `scripts/attachment-review-api.test.cjs`：执行真实 Route Handlers 和权限 helper，仅替换会话、数据库传输和无关详情展示。覆盖格式/身份注入、匿名/编辑/只读/撤权拒绝、合法审核、数据库二次拒绝、候选列表、批量分派及人工编辑竞争冲突。
- `scripts/attachment-review-db.test.mjs`：PGlite 执行仓库实际附件表 DDL、RLS、审核历史和业务触发器、历史队列及完整新迁移；Auth 和无关业务表为合成 fixture。覆盖直接表写入伪造、批量原子回滚、审核身份绑定、证据修订、过时 AI 拒绝、合法重新预审确认、角色覆盖和业务冻结。
- 专项命令：`npm run test:attachment-review`，19 项通过，0 失败/跳过；包含无交互登录的可信服务端待审附件写入兼容性。
- 两个行为回归文件已纳入 `npm run test:release-local`，由现有 CI 持续执行。原有只匹配源码文本的附件契约测试保留，但不再作为权限隔离的唯一依据。

## 验收与部署边界

已对照业务字段、人工复核和证据链验收条款检查：AI 不自动确认，审核留痕，字段变更撤回旧确认。不涉及页面布局和新增图形资产。

本地 typecheck、lint、生产构建通过。最终 `npm run test:release-local` 共 175 项通过，0 失败/跳过。迁移历史离线校验通过：172 个历史迁移保持原内容，3 个 pending（包含本轮 1 个），52 个归档原始文件保持原内容。

官方 `supabase db advisors --local --type security` 与 `supabase migration list --local` 因本机 127.0.0.1:54322 无数据库服务而无法执行。PGlite 行为回归不替代全量历史迁移重放、真实 PostgREST/Auth/Storage 会话、多连接并发和目标环境顾问检查。

发布时需配套应用代码与新迁移，重新预审没有 evidenceVersion 的历史待审记录，并在批准的独立环境验证真实角色会话。原审计中的集成配置最小化风险不在本次附件修复范围，仍需单独核查。
