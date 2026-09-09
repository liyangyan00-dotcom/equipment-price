# 评审环境权限核查与首项修复

## 范围与结论

2026-09-06对当前项目进行只读目录查询，核对20个可由authenticated调用的public SECURITY DEFINER函数，以及底层成员/角色/权限帮助函数。没有执行云端业务写入或DDL。

确认一个跨组织读取缺口，已生成本地迁移并在隔离PostgreSQL/WASM实例执行回归。云端尚未应用，不能称线上漏洞已经关闭。其他19个入口在源码中存在组织权限或成员校验，但尚未全部做真实账号端到端测试，不作全面安全保证。

## P0：已完成AI运行在授权前返回

- 函数：`public.wpi_finish_equipment_ai_review`。
- 历史定义：`supabase/migrations/20260813113559_prepare_equipment_review_ai_capability_p1.sql:216`；本轮查询确认云端具有同样顺序。
- 旧流程：登录校验 → 按ID加载运行 → 若非queued/running则返回完整行 → 权限检查。
- 影响：其他组织的登录用户知道运行UUID时，可通过此RPC取得终态运行的input_snapshot、output_payload等字段，绕过表级读取限制。UUID难猜不等于权限控制。
- 修复：任何记录返回前先校验该组织price.review权限及申请人/管理员身份；终态合法重试保持幂等。未删函数、未改表、未取消正常审核功能。
- 迁移：`supabase/migrations/20260906114755_guard_terminal_ai_review_authorization.sql`。
- 待部署清单：`supabase/pending-migrations.json`；历史172条迁移及52份归档原件保持不变。

## 本地执行证据

`npm run test:reviewer-rpc`使用固定版本PGlite 0.5.8执行实际PL/pgSQL函数。认证UID来自隔离会话适配器，权限判断加载已有迁移中的真实函数；没有连接生产数据库。

1. 先执行历史函数，证明其他组织账号不能直接SELECT表，却可从终态RPC读取测试私有字段。
2. 应用新迁移两次，验证可重复执行。
3. 匿名、viewer、其他组织admin、失效reviewer、同组织非申请人reviewer均拒绝读取。
4. 合法申请人及manager对completed/needs_review/failed/cancelled记录保持幂等，不覆盖原输出。
5. 权限被撤销的原申请人仍被拒绝。
6. 活动运行完成后保存AI建议，价格审核保持pending并要求人工确认。

测试计数10包含外层测试及9个子场景。此证据覆盖目标函数控制流，不覆盖整个Supabase网络认证、全部RLS/Storage策略或完整生产结构。

## 其他权限检查证据与未完成项

- 云端viewer默认仅有supplier.read、price.read、inquiry.read、project.read、report.read、file.read；本次查询没有viewer组织覆盖规则。
- `private.wpi_has_permission`校验auth.uid、组织ID、有效成员及角色覆盖；`wpi_has_any_role`校验同组织有效成员和允许角色。
- 附件分派、价格审核、目录审核、供应商审核、导入保存/提交、套价确认、密钥设置/清除等入口具有对应组织权限判断；不能把所有SECURITY DEFINER告警机械地认定为漏洞或直接撤销EXECUTE。
- 附件访问审计允许file.read用户记录自身访问事件，是追溯机制，不属于业务审批；只读账号也不应禁用必要安全审计。
- 自动化健康/矩阵入口允许同组织成员查看，仍需评审数据脱敏；集成状态及错误信息不能包含凭据。
- 下一步：独立viewer账号逐一测试API、直接RPC、Storage和Edge；验证目标工作组不含正式数据；对角色覆盖和组织切换做回归。
- 泄露密码保护未启用提示仍待部署配置核对，不因本次函数修复而解决。

## 依赖检查

为本地数据库回归增加devDependency `@electric-sql/pglite`（固定0.5.8，不进入生产依赖）。安装检查发现brace-expansion、browserslist、js-yaml、nanoid四组漏洞，按现有依赖兼容范围定向更新；未执行强制大版本audit fix。全量及omit-dev审计均返回0。此为当前依赖告警状态，不是系统无漏洞证明。

构建、类型、Lint、97项组合测试及迁移历史/待部署清单检查在本轮执行；部署前仍需对最终版本重新验证。

## 地材数据接口补充保护

后续检查发现material表UPDATE只检查price.write，既允许编辑员直接改变审核状态，也阻止没有写权限的合法reviewer审核。已生成第二条本地待应用迁移`20260906132338_guard_material_price_review_permissions.sql`，通过19项实际PostgreSQL测试，涵盖角色/字段/状态保护、审核身份防伪及既有人工采集/报价导入兼容。详见MATERIAL_REVIEW_DATABASE_GUARD_2026-09-06.md。两条迁移都没有应用到云端，发布阻断未关闭。
