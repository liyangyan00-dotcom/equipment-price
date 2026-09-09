# 水务智采 Vercel 正式发布记录

2026-09-09，按用户授权正式部署，并在核对共享数据库兼容性后应用三条审核保护迁移。本记录更新此前“未部署”的历史状态，不等于完整参赛评审环境验收。

## 部署信息

- 生产地址：https://shuiwu-zhicai.vercel.app
- 团队：world-connect1（team_R8PMeNABTQ5TVQ6JskLxmdTu）
- 独立项目：shuiwu-zhicai（prj_ufMAs9yUmV0iO9N8UiI8cjgwvk3c）
- 部署：dpl_AYvusnQ2Kfd6A8GxHwms4t6SDTVz，READY，已提升至生产。
- 应用版本：3ae9da77458abb68a8e3ddf42b3ebc73ec02373a。
- 源码从 Git 提交导出，仅上传 src、public、assets 与构建配置；未上传本地环境文件、待归档资料、测试会话或数据库备份。
- Next.js 16.3.4，Node.js 24.x；npm ci 和 npm run build 在 Vercel 成功完成。
- 仅在新项目配置 Supabase URL、publishable key 和确定性设备审核 provider。未配置服务角色密钥，未配置 Git 自动部署，未改变已有项目环境变量。
- 使用既有水厂价格库数据库与账号体系；这不是独立脱敏评审数据库。

## 数据库迁移

目标：tkyvafheqyshbjqnzbgq。用户明确批准应用。原始 SQL 文件保持不变；云端执行增加 5 秒锁等待与 60 秒语句超时上限。

| 本地审核版本 | 云端执行版本 | 迁移 |
| --- | --- | --- |
| 20260906114755 | 20260909144213 | guard_terminal_ai_review_authorization |
| 20260906132338 | 20260909144223 | guard_material_price_review_permissions |
| 20260909101242 | 20260909144238 | guard_attachment_review_authorization |

supabase/pending-migrations.json 记录原始 SQL 哈希及云端版本映射，待应用列表已清空。不要再次执行旧文件；后续 CLI 迁移须先按映射核对历史。

云端确认 evidence_version 为非空 bigint、默认值 1；地材与附件保护触发器存在；anon 无附件审核 RPC 执行权；authenticated 无审核历史直接插入权。40 项本地 PostgreSQL 回归通过，包含人工来源转入和服务端附件写入兼容性。

供应商报价门户云端函数仅涉及询价及报价相关表，不直接写入此次新增触发器的两张表；未重新部署或修改该函数。没有执行历史 seed、批量业务更新或真实报价提交。

## 既有项目保护核对

以下项目发布前后项目 ID、updatedAt、生产部署 ID 和域名列表完全一致：

| 项目 | 地址 | 发布后检查 |
| --- | --- | --- |
| sitecheck-ai-v1 | https://www.sitecheck.cn | HTTP 200 |
| drc-wb-tender-radar-staging | https://rdc-tender.cn | HTTP 200 |
| wpi-supplier-quote-portal | https://wpi-supplier-quote-portal.vercel.app | HTTP 200 |

供应商报价门户 Edge Function health 接口 HTTP 200。上述为部署配置与公开入口核对，没有提交真实业务数据验证。

## 公网验收与限制

- 新系统 /login 返回 200；品牌图标加载成功；1400px、390px 浏览器检查无横向溢出、无页面脚本异常。
- 匿名 /dashboard 跳转应用登录页。
- 匿名 /api/attachments 与 /api/material-prices 返回 401。
- 部署唯一 URL 保留 Vercel 保护，通过 CLI 授权访问验证；固定生产地址公开提供应用登录入口。
- 未取得账号密码，因此未执行线上真实登录后的完整业务写入验收；请使用原有账号登录核验。
- 未改变共享 Supabase Auth 的 Site URL 或重定向白名单；现有账号密码登录不依赖邮件回调，新域名注册确认邮件流程须另行验证。
- 已有采集 Worker 和外部 AI 集成未在本次重新发布，不将确定性审核适配器描述为真实模型推理。

## 后续发布

必须明确指定新项目 ID；不要复用其他项目的 .vercel 目录、域名或部署命令。当前生产源码基线为上列应用提交，发布记录及迁移账本的后续提交不改变已部署应用代码。首次发布没有可回退的旧应用版本；如需撤回，仅处置 shuiwu-zhicai 项目，不回滚共享数据库、不操作其他项目。

## 管理页面权限提示修复（2026-09-09）

- 应用提交：`0f262c1`；部署：`dpl_4m7pktpKPhpSp25zj1CvNxiB7Eo4`。
- 正式地址仍为 https://shuiwu-zhicai.vercel.app ，独立项目 ID 不变。
- 用户管理、角色权限及角色详情将 API 403 呈现为“当前账号无管理权限”，不再显示失败统计、邀请或权限配置操作；加载和服务异常也不会显示零值统计。
- 系统设置的组织与成员分类仅对 admin 显示；后端管理员权限检查保持不变。本次没有数据库或账号权限变更。
- 验证：TypeScript、定向 ESLint、7 项 settings-safety 测试、6 项角色入口测试通过；浏览器覆盖真实 editor 登录、三个管理页面拒绝访问、API 403、入口隐藏，以及本地模拟 503 重试、admin 成功数据呈现和刷新后权限撤销。管理员展示验证使用模拟响应，没有授予临时账号管理员权限或修改真实业务数据。
- 正式构建 READY，部署唯一地址登录页 HTTP 200 后提升生产；正式地址通过真实 editor 登录回归。
- 手机端设置内容区无横向溢出；全站现有顶部栏仍存在窄屏横向溢出，本次未调整全站布局。
- 现场询价、招标及供应商报价门户的项目 ID、updatedAt、生产部署 ID 发布前后相同，三个公开入口均 HTTP 200。
- 可回退的上一水务智采部署：`dpl_AYvusnQ2Kfd6A8GxHwms4t6SDTVz`。回退仅限该独立项目。
- 回归脚本：`node --test scripts/settings-access.test.cjs`；浏览器脚本 `node scripts/settings-access-browser.cjs` 从 SETTINGS_TEST_EMAIL / SETTINGS_TEST_PASSWORD 读取临时环境变量，不保存密码或会话。正式只读验证另设 SETTINGS_TEST_URL 和 SETTINGS_TEST_PRODUCTION=1。
