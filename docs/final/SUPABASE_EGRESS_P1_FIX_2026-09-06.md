# Supabase Egress P1 修复记录

日期：2026-09-06。结论：本轮完成高频请求与大字段传输修复，P1 尚未全部关闭。
未修改数据库结构或业务数据，未部署 Edge Function，未提交或推送代码。

## 已实施

| 审计项 | 修改 | 主要文件 |
| --- | --- | --- |
| E02 | AI任务列表使用字段摘要；全文仍由详情接口读取；审核前重新取得完整详情。任务无活动时停止轮询；活动任务30秒，运营60秒，隐藏暂停、请求周期互斥、有限退避 | src/app/ai-workbench/page.tsx；src/app/api/ai/tasks/route.ts |
| E02 | 运营响应按组织、用户、角色缓存30秒并合并并发读取，每次读取缓存前仍认证；失败和含Cookie响应不缓存；缓存最多128项 | src/app/api/ai/operations/route.ts；src/lib/data/scopedResponseCache.ts |
| E03 | 报告中心不再每分钟或每次聚焦重载四组数据；Realtime按表失效，忽略任务执行中的阶段进度；隐藏时延后刷新，失败有限退避 | src/app/ai-report-center/page.tsx |
| E03 | 报告摘要不带content正文，筛选项只读取project字段；项目名称选择不再加载项目明细 | src/app/api/reports/route.ts；src/app/api/project-pricing/route.ts |
| E04 | 报价识别轮询当前文件的状态与AI摘要，30秒一次；结束后只同步该文件详情，保留其他列表行；统计改为数据库head count | src/components/quote-recognition/QuoteRecognitionWorkbench.tsx；src/app/api/quote-recognition/route.ts |
| E05 | 统计分析只读取实际使用的metadata键和input_payload.targetType，不改变价格所属期、可比价格与未知日期判断 | src/app/api/analytics/route.ts |
| E05 | 审计列表不再携带old_data/new_data；点击详情再经过权限检查读取。近期统计缓存15秒，成员不再每次翻页重读 | src/app/api/settings/logs/route.ts；src/app/settings/logs/page.tsx |
| E06 | 顶栏统一传递导航计数，侧栏取消独立请求、路由和聚焦轮询；顶栏短缓存30秒，通知修改使缓存失效，业务刷新事件可强制重读；认证不缓存 | src/components/layout/AppTopbar.tsx；src/components/layout/AppSidebar.tsx；src/app/api/topbar/route.ts；src/lib/data/navigationCounts.ts |
| E07 | 发现队列查询错误不再视为空队列退回seed；已有queued记录使用条件领取；单来源本轮重复链接不重复登记 | supabase/functions/wpi-price-collector/index.ts |

公共轮询控制：src/hooks/useVisiblePolling.ts 与 src/lib/priceCollection/polling.ts。
401/403立即停止自动重试，其他连续失败最多5次；用户仍可手动刷新。
运行中收到新活动不会被旧请求的完成状态覆盖。

## 验证

- `node --experimental-strip-types --test scripts/collection-polling.test.mjs scripts/egress-p1.test.mjs`：23项通过。
- `npm run test:contracts`：60项通过。两项旧契约原本要求固定轮询和整个input_payload，已替换为新受控轮询与字段投影断言，未删除对应业务验收。
- TypeScript类型检查与本轮相关TS/TSX文件ESLint检查通过。
- Worker通过TypeScript语法转译检查；未执行Deno完整类型检查或远端部署。
- 云端只读SQL验证任务摘要、报告摘要、价格metadata投影字段可用。报价文件表当前为空，仅验证字段查询，不宣称完成真实报价解析验收。
- 本地服务 http://127.0.0.1:3100 已启动。
- Playwright新会话访问工作台跳转登录；5个受保护API返回401及no-store，未绕过身份验证。
- 自动化浏览器没有现成登录会话，登录后的页面网络时序、人工审核和完整业务回归尚未实测。

## 尚未关闭的 P1

1. E05：地材、供应商列表仍依赖全量数据做筛选、统计和分析。需要同步拆分服务端分页、全量统计、筛选项和导出，不能仅增加limit后把截断数据当全部结果。
2. E05：采集结果列表与分析样本仍有重复查询；统计接口虽然裁剪大字段，仍有最多5000行的应用层聚合。需继续迁移到保持相同统计语义的服务端聚合。
3. E03/E04：报告中心仍保留原有摘要列表数量上限；报价识别初始化仍取30份文件明细。本轮移除了它们被高频全量轮询的路径，但未完成全部列表/详情分页改造。
4. E07：尚未实现跨执行、跨周期的ETag/Last-Modified或来源版本缓存。现有修复减少本轮重复登记和竞争领取，不能等同于完全增量抓取。Worker修改尚未部署，云端不会自动生效。
5. E06：认证与组织成员资格仍逐次校验，未以权限缓存换取请求量下降。短缓存是进程内缓存，冷启动或不同实例可能重复加载。

## 用量口径

本轮没有新的账单拆分数据，不给未经验证的占比或月度GB保证。
部署并完成登录态回归后，应比较3至7天按项目、服务拆分的Egress与路由请求量。
不要将测试次数、SQL字段投影成功、外部网页下载量直接换算为Supabase账单流量。
