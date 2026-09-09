# 推送前对比与候选准备

日期：2026-09-09。已完成 origin 拉取核对，当前 main 和 origin/main 均为 `6292618fad26918f92c0b8e37198c4194336eca2`，ahead/behind 为 0/0。实际暂存区保持为空，未创建提交、未推送、未部署或执行云端迁移。

## 对比结论与范围

仓库基线只有 Initial equipment price intelligence system 一次提交；当前工作树包含完整业务系统累计开发，不能把上一轮附件安全修复当作独立于这些新增代码的小补丁。

验证用候选树为 `e05c635593dcd39d6b6a16240c781d03d476be3a`，包含 1196 个完整文件，相对 HEAD 为 825 个变更（768 新增、57 修改），160295 行新增、5041 行删除。本报告及随后生成的文件清单、清单元数据是额外三份推送准备文档，不改变该验证树的应用源码。

| 对比区域 | 相对初始仓库的变化 | 准备结论 |
|---|---|---|
| src | 377 新增、47 修改；117 个 API 路由，认证、共享交互、业务页面、数据访问与类型 | 需整体纳入候选，DashboardClient、LoginForm、AiPriceWorkflowNav、Toast 等被已修改文件直接引用；不能漏掉未跟踪文件 |
| supabase | 312 新文件；迁移、历史核对快照、归档、配置与 8 个 Edge Function 源文件 | 历史与待发布清单通过离线核对；推 Git 不会替代数据库或函数部署 |
| scripts | 28 新文件，含回归、固定输入样本与迁移历史检查 | 已闭合测试输入依赖，业务 seed 脚本不会在 CI 运行 |
| docs | 验证树内 40 新文件 | 审核文档与实施说明纳入；另 16 个截图/供应商资料文件暂缓 |
| 配置与部署 | 锁文件、Next.js、ESLint、环境模板、CI 和独立报价门户 | 依赖补丁已验证，CI 无业务凭据、无自动数据库迁移步骤 |

本轮检查包括版本差异盘点、关键依赖闭合、近期权限修复的行为回归、可复制安装构建与敏感模式扫描；不是对约 16 万新增代码行或所有历史业务路径的逐行安全审计。

## 本轮发现并修复

1. **干净 CI 缺失输入**：工作流契约测试读取被忽略的 `artifacts/acceptance/quote-recognition-sample.csv`，在候选目录实际复现 ENOENT。将同一合成 CSV 固化到 `scripts/fixtures/`，调整读取路径，保留全部解析断言，没有改成跳过测试。
2. **依赖漏洞**：干净 npm ci 报告 3 个受影响包，Next.js critical、sharp high、csv-parse moderate。更新并锁定 Next.js / eslint-config-next 16.3.4、sharp override 0.35.4、csv-parse 7.0.2，重新安装后 npm audit 为 0。依据：[Next.js 官方安全公告](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)、[sharp 公告](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c)、[csv-parse 公告](https://github.com/advisories/GHSA-8cw4-87c7-c6xx)。此次为同一 Next.js 主版本内更新，未发现需要 codemod 的旧版请求 API。
3. **持续门禁遗漏**：把已有 settings-safety、login-error、collection-coverage 的 16 项测试纳入 test:release-local，累计从 175 项扩展到 191 项。CI 增加 `npm audit --audit-level=moderate`。
4. **候选污染及格式**：环境示例改为通用项目 URL；临时导出目录明确排除出 ESLint/TypeScript 输入；清理 24 个非历史 SQL 文件的行尾空格/末尾空行。未改写迁移历史以掩盖 diff 警告。
5. **浏览器测试打包兼容性**：干净依赖安装后，原手写 CommonJS 打包器在材料列表挂载时因 ESM 的 export 语法失败。补上 ESM JavaScript 转换、依赖发现和按模块语法检查；完整浏览器测试随后通过，未删断言或替换业务组件。

## 验证记录

候选通过独立 GIT_INDEX_FILE 生成，再用 checkout-index 导出完整文件；没有使用当前暂存区。先在项目 tmp 中验证，又在系统临时目录重新执行 npm ci，避免使用项目 node_modules 或 .env.local。系统临时目录为 `C:/Users/18651/AppData/Local/Temp/equipment-price-prepush-20260909-28bceacf`。

| 检查 | 结果与边界 |
|---|---|
| git fetch origin | 成功，本地与远端基线一致，无分叉 |
| npm ci / npm audit | 全新安装成功，0 漏洞；没有 npm audit fix --force |
| test:release-local | 候选与系统临时目录均为 191 通过、0 失败/跳过；包括 API 合成传输、PGlite 和源码契约测试 |
| npm run lint | 0 错误、4 条内部跳转建议，退出码 0；新增 Next.js 规则提示，未禁用规则 |
| npm run build | 项目内候选及系统临时目录均通过构建和 TypeScript 检查，83 个静态页面；无 .env.local。系统临时目录构建正确忽略了用户主目录的额外锁文件 |
| test:browser-material | 系统临时目录的新构建 CSS + 真实 React 组件通过；包括审核/新增/编辑/列表、供应商分页、错误/重复/版本/导出与 1440/390 截图；API 为合成响应，不能视为真实登录验收 |
| npm run check:migrations | 172 历史迁移、3 pending、52 份归档原件一致；只核对本地保存的 2026-09-06 云端快照 |
| 源码引用与大小写 | 候选 src 本地静态引用缺失 0、大小写不匹配 0、路径大小写碰撞 0 |
| 文件及敏感模式 | 环境配置、缓存、日志、会话与本地平台元数据未进入候选；私钥、常见提供商 token/JWT/带密码连接串扫描无命中。额外赋值候选均核对为占位文本/HTTP 头名称，不是密钥 |
| Git 空白检查 | 应用和配置已无报错；29 条提示均来自历史/归档 SQL 的 EOF 空行，保持原件与历史核对一致，不以格式清理重写历史 |
| CI 配置 | YAML 可解析，共 10 步；只读 contents 权限；checkout v7 和 setup-node v6 的固定 SHA 经官方 Git 标签再次核对一致 |

Lint 的四条建议在 `src/app/inquiries/create/page.tsx:894,922`、`src/components/inquiries/InquiryManagementCenter.tsx:720`、`src/components/settings/CollectionSourceManager.tsx:204`，建议内部跳转使用 router。它们不是权限测试失败，也未在本轮改写业务导航行为。

## 候选文件与推送方式

`PUSH_CANDIDATE_PATHS_2026-09-09.txt` 为明确的变更文件清单；`PUSH_CANDIDATE_MANIFEST_2026-09-09.json` 记录基线、验证树和暂缓文件。完整文件 SHA-256 及本地候选索引保存在被忽略的 `tmp/push-preflight-20260909/`。

建议提交到审核分支 `codex/prepush-business-review-20260909`，提交标题草案：`feat: integrate business workflows and enforce review permissions`。这些名称目前仅作为后续操作草案，本轮未创建分支或提交。

后续应刷新 origin，确认 HEAD 与清单基线仍一致后，使用 literal pathspec 从清单暂存，并审查暂存差异；不要使用 `git add .`。

```powershell
git switch -c codex/prepush-business-review-20260909
git --literal-pathspecs add --pathspec-from-file=docs/final/PUSH_CANDIDATE_PATHS_2026-09-09.txt
git diff --cached --stat
```

暂缓的 16 个文件是 `docs/screenshot-diffs/` 下 10 个文件与 `docs/supplier-data/` 下 6 个资料文件，均留在原处。运行时引用的 src/data/mock 仍在候选中，不能只因目录名为 mock 而移除。

## 发布仍待完成

- 首次 GitHub Linux CI、真实登录角色会话、PostgREST/Storage/Edge Function、多连接并发以及数据库顾问检查未由这些本地测试替代。
- 3 个 pending 迁移尚未应用云端；附件代码依赖新的 evidence_version 和 RPC，需要按发布计划配套上线。R03 目标环境验收仍未关闭。
- 原附件审计列出的集成配置最小化风险和全系统剩余验收继续保留；本轮不宣称整个系统已通过上线安全审计。
- 模式扫描不是完整商业隐私审计；暂缓资料、真实业务数据和仓库可见性应按后续发布范围处理。

补充：Next.js 16.3.4 构建会为 next-env.d.ts 增加 root-params 类型引用；已在工作树执行 next typegen 生成同一结果，保持候选文件与独立目录的构建结果一致。最终清单含 828 个变更文件（上述 825 个变更加三份推送准备文档）。
