# 地材数据库审核权限保护（待部署）

日期：2026-09-06。范围：本地迁移与PostgreSQL执行测试。未向云端应用DDL，未修改或删除正式业务数据。

## 缺口和修复

- 当前云端历史策略`wpi_material_update`只有`price.write`检查：编辑员可以直接更新review_status，而没有price.write的reviewer无法更新审核结论。API的角色校验无法保护直接Data API。测试先执行原策略，实际复现两种行为，再应用新迁移验证。
- 新增`private.wpi_guard_material_price_review()`，作为SECURITY INVOKER、空search_path的BEFORE INSERT/UPDATE触发器。始终读取auth.uid并检查同组织有效成员、权限及角色，不因为调用者处于SECURITY DEFINER内部而直接放行。
- 数据库生成updated_by、updated_at、reviewedBy、reviewedAt及审核决定；客户端伪造审核人或时间不能生效。普通草稿写入不得伪造审核信息。
- 编辑员可写draft/pending_review；修改已通过/驳回价格必须回到草稿或待审核，清空当前审核结论，保留证据和历史审计。审核与业务字段修改不得合并为同一次操作。
- reviewer仅可提交审核字段，不能改金额、来源、证据、地区等业务字段；审核需要人工说明。归档后禁止更新，身份字段、组织和编号不可转移。
- UPDATE策略允许price.write或price.review，但触发器进一步限制各角色的字段与状态。DELETE策略保留授权审核角色的现有删除能力，同时不让viewer借助误配的price.review覆盖规则删除价格。没有执行任何业务删除。

## 人工入库兼容

- 人工采集线索转正式价格：要求same-org、material、ready及已有reviewed_by/reviewed_at。现有RPC在写正式价格之后才标记transferred，所以保护检查使用ready而非transferred；月报没有供应商实体、没有valid_until的合法来源不会仅因这两项被此权限保护误伤。
- 报价文件人工导入：要求同组织报价明细和文件、可审核明细状态及可审核文件状态，保留人工修正价格/单位后入库能力。不能只靠source_type或JSON中的来源ID放行。
- 这两条路径本身是审核权限保护的显式人工操作，历史接口未强制非空说明。缺少原说明时只写明“人工授权来源导入”这一操作事实，不编造核验细节；数据库记录执行人和时间，来源原审核信息仍保留。
- 触发器名`wpi_zz_guard_material_review`排在既有单位/证据规范化触发器之后，检查最终规范化字段。依据[PostgreSQL触发器顺序说明](https://www.postgresql.org/docs/current/trigger-definition.html)。

## 本地证据

- 迁移：`supabase/migrations/20260906132338_guard_material_price_review_permissions.sql`，由Supabase CLI生成文件名；已登记pending清单和规范化MD5。
- `npm run test:material-review-db`：19项通过（1个外层测试加18个子场景），实际执行PostgreSQL/PGlite中的表、RLS、权限函数、触发器和既有人工入库RPC，不是正则断言或替代业务函数。
- 覆盖历史越权复现、直接已通过插入、reviewer合法审核、审核人/时间防伪、编辑权限、角色覆盖、撤销权限、跨组织/未登录/失效成员、评论要求、状态退回、原证据保留、身份不可转移、归档、采集单位规范化、报价人工修正、重复导入幂等和异常回滚。
- 迁移执行两次验证幂等。测试加载实际material表定义；认证UID使用隔离会话适配器，部分支持表为最小fixture，不是整个Supabase生产结构克隆，不能代表完整生产约束、Storage或网络认证实测。
- 加入已有API、日期、配置、轮询、缓存、RPC和业务契约后的组合回归138项通过；新测试脚本ESLint通过。离线迁移核对为172条云端历史、2条pending、52份保留原件；不是云端应用证明。本轮仅新增SQL/测试/脚本文档，未重跑前端构建。
- 云端仅做只读兼容预检：ready地材线索0条，其中缺人工审核记录0条。这是空集合，不能推断历史记录全部合规；没有修改现有记录以使它们通过检查。

## 应用边界和未关闭项

1. 两条待应用安全迁移均未获得本轮云端执行授权。先在独立评审/预发布环境应用并核验，再安排正式发布；不得将pending文件当作已上线。
2. 没有auth.uid的维护程序将被此触发器拒绝改写地材价格。已检索到的当前业务写入是用户API及两条人工RPC；部署前仍须检查外部脚本和Worker。不得通过service_role无条件放行来绕过审核。
3. 非幂等单位/证据规范化可能使旧记录在审核时被识别为业务字段变化并拒绝，需要编辑员先核对、保存再审核；不能自动重写正式价格绕过保护。
4. 此迁移保护授权、状态及审计身份，不等于完成报价字段有效性、供应商同组织外键、证据授权/真实性、CDF汇率来源或最终套价准入。相关业务检查仍需单独补齐，尤其不能把有权限的手动确认等同于AI自动核验成功。
5. 未测试全量云端并发、已有所有触发器的组合、Storage和Edge。正式部署需验证实际API角色/组织、两条公开RPC及错误回滚，记录版本和结果。
6. 应用后禁止直接回退到原宽松策略；若出现兼容问题，应定位具体写入路径并修正，保留审核保护。紧急回退需要单独评估与授权。
