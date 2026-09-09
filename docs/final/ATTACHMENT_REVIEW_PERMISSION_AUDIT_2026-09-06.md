# 附件审核与评审环境权限审计

后续进展：2026-09-09 已完成本文附件问题的本地代码修复与持久行为回归，见 [附件审核修复记录](ATTACHMENT_REVIEW_SECURITY_FIX_2026-09-09.md)。原始审计证据保留如下；云端迁移与 R03 发布验收仍待完成。

状态：发现未修复问题，不构成发布通过。审计未修改业务代码、数据库结构或云端数据。

## 已复现问题

### P0：直接UPDATE可绕过审核并伪造确认身份

- 授权位置：`20260726154815_wpi_isolated_core_auth_rbac_audit_storage.sql:46` 授予authenticated附件表UPDATE权限。
- 行策略位置：`20260813094946_harden_equipment_evidence_chain_p1.sql:57` 仅检查file.write，没有限制可修改的字段。
- 现有保护位置：同一迁移第67行设备证据保护函数，对非equipment_price附件直接返回，不校验确认状态或审核身份。
- 队列触发器位置：`20260902111946_attachment_review_queue_governance.sql:142` 只在INSERT或修改checksum/related_type/related_id时运行；仅更新review_state、verification_status和verified_by不会触发它。
- 本地复现：加载仓库实际SELECT/UPDATE行策略、权限函数及设备证据保护触发器，以authenticated editor身份，对合成material_price附件执行直接UPDATE。没有AI记录、没有调用审核RPC，仍返回confirmed/verified，并保留任意指定的verified_by。
- 边界：采用最小合成表结构，未加载全部历史迁移和外键；伪造审核人的测试值在完整库中还需满足用户外键。该结果证明所测策略及触发器没有身份校验，不代表已在云端写入或复现。通用时间戳与审计触发器未加载，不能据此断言没有任何通用审计日志。
- 修复要求：API与RPC门禁之外，必须限制INSERT/UPDATE的终态、审核人、审核时间和组织/业务身份字段；不能让有file.write的用户直接填写审核元数据。合法审核路径应绑定当前有效审核者并在同一事务写入审核记录，保留业务准入校验。
- 关闭依据：直接表INSERT/UPDATE伪造confirmed、verified、verified_by、verified_at及metadata中的审核结论被拒绝；非终态的合法资料补充仍可用；业务关联或文件内容发生变化时明确撤销旧确认；跨组织迁移、批量写入与权限撤销回归通过。
- 注意：只修复下方RPC的OR条件不足以关闭此P0。不能使用可由普通客户端自行设置的会话标记作为可信“来自审核RPC”证明。

### P0：文件编辑权限可提交最终附件确认

- API位置：`src/app/api/attachments/[id]/review/route.ts:24`。认证、组织内查找后调用审核RPC，没有独立审核角色检查。
- 数据库位置：`supabase/migrations/20260902111946_attachment_review_queue_governance.sql:289`。权限条件为 `price.review OR file.write`；后续确认分支验证业务关联、AI预审和问题数量，但不再要求审核权限。
- 默认角色依据：`supabase/migrations/20260726154815_wpi_isolated_core_auth_rbac_audit_storage.sql:27`。editor具有file.write，不具有price.review。
- 影响：已具备业务关联、成功AI记录且无未解决问题的附件，可以由文件编辑员直接标记confirmed并写入审核人。不能据此推断价格也已直接正式入库。
- 修复要求：在API与RPC统一使用有效审核权限及明确的审核角色边界；文件上传、编辑和补充资料不自动授予最终确认权限。进一步核对表级UPDATE/RLS和触发器，防止绕过RPC直接改终态。保留合法审核员和管理员的流程。
- 关闭依据：editor有file.write但无price.review时，确认、驳回和审核决定写入被拒绝；合法审核员正常；匿名、失效成员、跨组织和权限撤销均拒绝；审核记录由服务端绑定当前身份。

### P1：可将附件审核任务分派给无审核能力的viewer

- 数据库位置：同一迁移 `20260902111946_attachment_review_queue_governance.sql:239`。分派人要求price.review，但接收人只需同组织is_active成员。
- API位置：`src/app/api/attachments/actions/route.ts:16`。允许角色分派后将目标用户交给RPC，不验证接收人的审核能力。
- 影响：分派成功并不代表接收人能够完成审核，会形成无法处理的待办和SLA超时。
- 修复要求：接收人必须属于同组织、有效且具有审核能力，考虑组织权限覆盖；UI选项、API和RPC采用相同约束。处理已分派后权限被撤销的任务，允许合法管理者重新分派，不能自动扩大接收人权限。
- 关闭依据：viewer、editor仅file.write、跨组织、失效用户和被撤销审核权限的接收人被拒绝；合法审核员分派成功；批量混合组织记录不得静默部分成功。

## 本地执行证据

本轮通过Node临时命令运行PGlite内存实例，退出码0。没有创建项目文件或连接外部数据库。

加载并执行仓库原始SQL函数：

- `private.wpi_has_permission`：20260820170917权限覆盖迁移。
- `public.wpi_submit_attachment_review`、`public.wpi_assign_attachments`：20260902111946附件治理迁移。

认证UID由本地会话适配器提供；最小表结构及三个组织内用户均为合成fixture。模拟默认editor的file.write、reviewer的price.review和无写权限viewer，未复制正式用户。

实际断言结果：

1. viewer提交confirmed抛出 `ATTACHMENT_REVIEW_PERMISSION_DENIED`。
2. editor提交confirmed返回 `reviewState=confirmed`，证明仅file.write可经过RPC审核门禁。
3. 重置合成记录为待审核后，reviewer向viewer分派返回 `affected=1`。

边界：没有加载完整历史迁移、全部业务触发器、Storage或Edge；不是云端当前定义及可利用性的完整证明。此临时复现尚未加入持久回归门禁；修复时必须固化回归测试并验证全模式兼容。

## 仍需验证的集成信息暴露风险

- `src/app/api/settings/integrations/route.ts` 的GET对已认证成员读取endpoint_url、credential_hint、config和集成审计；canManage只作为返回字段，不作为GET的入口门禁。
- `supabase/migrations/20260820213005_add_external_integration_management.sql:64` 的SELECT策略允许同组织成员，且后续授予authenticated表级SELECT。
- 普通viewer可能读取无需展示给评委的内部服务地址与配置。源码中的Vault凭据RPC具有settings.manage检查，不能把此项描述成已证明明文密钥泄露。
- 发布前必须审查评审环境实际config与日志字段，面向viewer只提供明确允许的脱敏运行摘要。若需要限制表读取，必须同时处理直接Data API路径，不能只在页面隐藏。
- 该项仅完成静态核查；云端表权限、实际数据内容和不同角色请求待验证，暂列P1信息最小化风险。

## 后续执行边界

### 累计门禁覆盖缺口复核

本轮重新执行 `npm run test:release-local`：156项通过，0失败、0跳过，退出码0。该结果与上文漏洞复现并不矛盾。

`scripts/workflow-contracts.test.mjs:1181` 的附件用例读取源文件，并用assert.match检查错误标识、RPC名称和页面标签是否存在，没有执行附件审核RPC或直接表写入，也没有测试editor/viewer身份。因此其“强制审核门禁”名称不能作为权限隔离通过的证据。

允许进入本地代码修复后，必须新增持续执行的行为回归：匿名/默认viewer拒绝；editor仅file.write拒绝审核；直接INSERT/UPDATE伪造审核终态和身份拒绝；合法审核员完整确认成功；缺证据/缺AI/存在问题拒绝确认；无审核能力接收人分派拒绝；跨组织与权限撤销拒绝。数据库回归加载实际待发布函数、策略和触发器，API回归验证错误码及无副作用；随后再以独立环境的真实登录会话进行外部验收。

当前没有修改已有测试以制造失败或掩盖问题，没有将临时复现冒充CI回归。R03保持未通过。

R03保持发布阻断。先明确附件编辑与审核职责，准备本地API/RPC/表级权限修复与持久回归；数据库迁移按项目流程另行核对后，在明确批准的目标环境执行。不得为演示临时给viewer加写权限，也不得关闭正式业务功能绕过问题。
