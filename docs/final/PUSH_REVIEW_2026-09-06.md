# 推送检查与候选清单

检查日期：2026-09-06。目标仓库：`liyangyan00-dotcom/equipment-price`。
当前分支：`main`。本轮未暂存、未提交、未推送，未执行数据库迁移。

## 结论

暂不建议直接全量推送。最近设置页修改检查通过，但远端基线落后于整个业务系统，不能仅提交配色组件后宣称得到可部署版本。
本轮检查为改动盘点、近期设置代码复核、自动化测试与候选路径敏感内容初筛，不是全部历史代码逐行审计。

## 发现的问题

1. **P1 迁移版本冲突**：`supabase/migrations/20260901103000_price_period_semantics.sql` 与 `20260901103000_standardize_talo_rebar_translations.sql` 使用相同版本号，内容不同。发布数据库前必须核对远端迁移历史并确定修复方案，不能盲目重命名已部署迁移或重放旧目录。
2. **P1 推送范围污染**：未跟踪的 `.next-stale-invalid-hook/` 含 19,206 个文件，另有开发日志、临时导出与异常命名文件。当前 `.gitignore` 只忽略 `.next/` 和部分日志，不能使用 `git add .`。
3. **P1 依赖不闭合**：整个 `src/app/settings/`、`src/app/api/`、认证库、多个共享组件及业务模块仍未跟踪；已修改 AppLayout 又引用未跟踪的工作流导航、Toast。设置修改不是独立于历史业务代码的小补丁。
4. **P2 测试不可完全复现**：`scripts/settings-home-check.cjs:8` 使用 `playwright`，但 package.json 未声明该开发依赖。需明确固定版本、浏览器安装及测试服务启动方式，再接入干净环境验收。
5. **待验收**：未执行生产构建、干净检出安装、真实账号保存回读、迁移重放或线上部署。设置提醒不覆盖浏览器前进后退和程序式导航；成员编辑亦未纳入本次保护。

## 候选提交分组

以下是审阅分组，不代表可分别独立部署。应在候选分支完成依赖闭合后统一验证。

| 分组 | 候选路径 | 推送条件 |
| --- | --- | --- |
| 运行基础 | `package.json`、`package-lock.json`、`tsconfig.json`、`eslint.config.mjs`、经补齐的 `.gitignore`、经核对的 `.env.example` | 成对提交依赖锁文件；不包含真实凭据 |
| 认证与共享界面 | `src/proxy.ts`、`src/app/auth/`、登录页、`src/lib/auth/`、`src/lib/supabase/`、布局与公共组件、导航 | 同时纳入实际引用的新增文件；组织权限不能绕过 |
| 历史业务基线 | `src/app/`、`src/components/`、`src/lib/`、`src/types/` 下采集、价格、供应商、询价、套价、附件、统计与报告相关改动 | 必须和对应 API、类型、依赖一起审阅；不是本轮逐行验收通过 |
| 设置首页 | `src/app/settings/page.tsx`、`src/components/settings/SettingsHome.tsx`、`src/lib/auth/accessFailure.ts`、`src/lib/auth/apiAccess.ts` | 保留组织读取失败状态及九个真实入口；不得只提交组件 |
| 设置安全 | `src/app/settings/{dictionaries,integrations,roles}/page.tsx`、`src/components/round8d/AiSettingsRound8DPanel.tsx`、`src/hooks/useUnsavedSettings.ts`、`src/lib/data/readSettingsPages.ts`、`src/app/api/settings/dictionaries/route.ts` | 配合现有设置子页面/API完整提交；真实保存回读待验收 |
| 测试与说明 | 四个测试文件、`scripts/settings-home-check.cjs`、相关验收清单、本文档 | 修复 Playwright 依赖；保留隔离测试说明 |
| 云端与数据库 | `supabase/functions/`、`supabase/config.toml`、`supabase/migrations/` | 单独审查；修复版本冲突，核对远端历史；推 Git 不等于部署函数或执行迁移 |
| 外部报价入口 | `deploy/supplier-quote-portal/`、`.vercelignore` | 核实发布目标、授权与演示数据边界，单独部署验收 |

`src/data/mock/` 不能整目录盲删或直接排除：仍需检查实际代码引用。数据名称含 mock 不代表生产页面使用它，反之通过测试也不能证明全部页面脱离 mock。

## 必须排除或暂缓

- `.env.local` 等真实环境配置、账号会话、访问令牌、服务端密钥。
- `.next/`、`.next-stale-invalid-hook/`、`node_modules/`、`*.tsbuildinfo`。
- `.dev-*.log`、`.next-dev-*.log`、`tmp/` 的日志、截图、检查产物。
- 根目录异常文件：`({reviewStatus`、`({type`、`JSON.stringify([x.data.reviewStatus`、`b.textContent.trim()`、`操作`。
- `artifacts/`、`docs/screenshot-diffs/`、`docs/supplier-data/` 等截图和业务数据先核对敏感信息，只按白名单纳入。
- `supabase/migrations-legacy-local/` 仅作历史归档候选，不作为待执行迁移。
- `next-env.d.ts` 当前仅由生成器将引用改为 `.next/dev/types/routes.d.ts`，暂不把此变化当作业务修复提交。
- 迁移/导入脚本不得在检查或推送时自动运行；需要核对目标环境和数据副作用。

## 本轮验证

- `npx tsc --noEmit`：通过。
- `npx eslint src --format json --output-file tmp/push-review-eslint.json`：464 个文件，0 错误、0 警告；不包括 Edge Functions。
- 设置安全 7 项、登录错误 3 项、采集覆盖 6 项、工作流契约 60 项：共 76 项通过。契约测试不等同于真实自动化运行。
- `node scripts/settings-home-check.cjs`：入口存在性、错误状态、1440/2386/390 尺寸隔离截图检查通过，未模拟为真实登录验收。
- `git diff --check`：已跟踪文件无空白错误，存在换行格式提示；不覆盖未跟踪文件。
- 对 `src/scripts/supabase/deploy/docs` 对应候选目录及 `.env.example` 检索常见私钥、sk/sb_secret/JWT 格式：未命中。此为模式初筛，不保证不存在其他格式凭据或业务隐私；未检查被排除的缓存和日志。

## 发布前顺序

1. 补齐排除规则，生成明确文件白名单；保持用户现有文件不删除、不回退。
2. 核对数据库迁移历史，解决同版本文件冲突；补齐测试依赖。
3. 在候选分支按上述分组提交并检查引用闭合，不直接推 main。
4. 干净安装、生产构建、受控账号业务回归及部署环境变量检查。
5. 最终检查暂存差异、敏感数据、远端更新和数据库备份，再经确认推送。
