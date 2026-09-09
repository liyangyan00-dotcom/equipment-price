# Supabase Egress 只读审计

审计日期：2026-09-06，北京时间。未修改业务代码、数据库结构、数据、Cron 或功能开关。本轮仅新增本报告。

## 结论与证据边界

用户提供组织 CHEC-RDC 本周期 30.649GB / 5GB（613%）、5 MAU。当前工具没有账单字节明细或 HTTP 响应日志，因此不能确认各问题占该 30.649GB 的实际比例，也不能保证改完后的组织总流量。

已确认三类高价值修复对象：高频完整重取、列表携带大字段/嵌套明细、跨页面重复聚合。最强代码证据是设备采集页面每 5 秒并发请求五个接口，其中初始化接口拉取全组织最近 200 条完整线索。AI 工作台和报告中心也会持续重取，但目前 AI 任务本身较小，不应夸大其字节贡献。

组织 xqmtiomczdleffsdzbqn 下实际有两个项目：

| 项目 | 当前只读观测 |
| --- | --- |
| tkyvafheqyshbjqnzbgq，水厂价格库系统 | Storage 共 3 个对象，15,669 字节；审计表约 161MB 磁盘占用、41,437 条估计活记录；200 条价格线索 |
| oxbmuuvfumogizskcoyp，另一个项目 | Storage 552 个对象，共 90,319,831 字节；招标数据等业务表，未审计其应用代码 |

存储占用、数据库磁盘大小和扫描次数都不是 Egress。另一个项目仅做了聚合盘点，不能将其用量归入本代码库；也不能以当前 Storage 很小排除历史下载、已删除对象或公开链接访问。

需要补齐：计费周期起止、两个项目各自 Egress，以及 Database / Storage / Realtime / Edge Functions / Shared Pooler / Auth 分项；Storage 命中和未命中分别看。已向用户请求截图。

## 实测数据

SQL 统计重置时间：2026-08-12 08:44:31 UTC。统计窗口未必等于账单周期，且不能区分开发人员、Agent 和终端用户。PostgREST 的 rows 通常是聚合包装行，不能用作实际传输业务行数。

| 查询模式或对象 | 当前统计 |
| --- | --- |
| 组织成员读取 | 53,213 次累计调用 |
| 顶栏组织名/用户资料等模式 | 各约 22,716 次累计调用 |
| AI 任务完整列表模式 | 6,209 次累计调用 |
| 主要线索完整列表模式 | 2,496 次累计调用，另有其他查询模式 |
| 采集发现记录 upsert 模式 | 92,797 次累计调用；这是写操作，不能等同于全表下载 |
| 最近 50 条 AI 任务全字段 | 18,803 字节 JSON |
| 最近 200 条价格线索全字段 | 837,311 字节 JSON |
| 最近 100 条采集任务全字段 | 22,660 字节 JSON |
| 最近 200 条来源运行全字段 | 58,367 字节 JSON |
| 最近 20 条父运行全字段 | 19,703 字节 JSON |

体积在数据库内聚合计算，仅取回字节数，未下载整表数据。上述尺寸是当前未压缩 JSON 代理量，不是 HTTP wire bytes：未计压缩、响应头、额外表、RLS范围差异和历史行数变化。

初步文本扫描发现 140 处以星号开头的 select、9 处 setInterval、4 处 Realtime channel 创建。星号包含单行详情和写后回读，不代表 140 处全表读取；动画定时器也不等于网络轮询。

## 问题、位置与修复优先级

P0 表示应最先处理的明确请求放大链路，不意味着已证明它占账单多数。

### E01 / P0：设备采集无条件每 5 秒重取五接口

- `src/components/equipment-catalog/EquipmentCatalogCollectionPage.tsx:685`、`:687`、`:733`：加载任务、来源、方式、导入历史、验证任务。页面入口 `src/app/equipment-catalog/collection/page.tsx:4` 确认组件可达。
- `src/app/api/price-collection/route.ts:832`：100 条任务、200 条线索、全部来源、20 条父运行、200 条来源运行及证据 task_id 统计。任务/线索/来源/运行多处 select('*')。
- 没有可见性判断、执行状态门控、请求互斥、失败退避；即使空闲也执行。清理定时器存在，但已发出的请求没有 AbortController。
- 同一批又调用 sources 接口，重复读取初始化已带回的来源。
- 方案：初始化仅一次；运行时轮询轻量 status/progress/updated_at，完成后停止；后台标签暂停；单请求在途，失败指数退避；来源、方式按权限范围短缓存；明细点开读取。
- 预计账单占比：未知，当前项目最高优先级候选。已测四部分合计 938,041 字节，5 秒一次约 675MB/小时，30 天每天 1 小时约 20.26GB，未含另四接口。后台节流、停留时间及压缩会显著影响实际结果。

### E02 / P1：AI 工作台持续读取任务正文与实时运营聚合

- `src/app/ai-workbench/page.tsx:560`、`:594`、`:600`：任务每 6 秒、运营每 30 秒，均 no-store，无空闲/隐藏停止和错误退避。
- `src/app/api/ai/tasks/route.ts:55`：pageSize=50 全字段，input_payload/output_payload 等跟随列表；`:43` 详情事件亦全字段返回。
- `src/app/api/ai/operations/route.ts:15`：每次两个 RPC 加快照、事件、500 条任务等；已有快照仍重新聚合实时健康。
- 方案：任务摘要投影，详情独立；只轮询执行中任务；运营优先读快照+更新时间，权限范围内 30–60 秒缓存与请求合并。
- 预计占比未知。当前任务列表仅 18,803 字节，6 秒一次约 11.28MB/小时、每天1小时约 0.338GB/30天，不包括运营查询。不能仅按调用频率认定它是主因。

### E03 / P1：报告中心 Realtime、定时与焦点刷新叠加

- `src/app/ai-report-center/page.tsx:1794`、`:1823`、`:1844`、`:1906`、`:1945`、`:1954`：reports、analytics、project-pricing、关联对象一起刷新；订阅 8 张表，500ms 防抖，另有 60 秒轮询及 focus 刷新。
- `src/app/api/reports/route.ts:53`、`:59`：默认500条、select('*')，报告 content 正文随列表传输。
- `src/lib/projectPricing/server.ts:127`、`:137`：50个项目及其明细字段拉回应用层汇总。
- 方案：按事件对应业务局部失效，合并焦点/定时请求；列表20条摘要，正文按需；项目摘要和统计由受控聚合接口返回。
- 预计占比未知。每轮若为 B MB，单页每分钟轮询的30天每天1小时流量为1.8B GB，Realtime额外触发另计；不与E02/E04等重复相加。

### E04 / P1：报价识别轮询 selected，但请求整个列表

- `src/components/quote-recognition/QuoteRecognitionWorkbench.tsx:119`、`:122`、`:150`：load(selected.id,true) 只影响前端选择，URL仍是 limit=30，没有 id；执行中每4秒加载30份文档。
- `src/app/api/quote-recognition/route.ts:20`、`:39`、`:42`、`:45`：文档、报价明细、证据全字段、AI输出以及审核统计；明细没有独立分页。
- selected 是对象，响应后会重新设置和重建定时器。存在清理，不是无限effect自触发；实际问题是定时拉取范围过宽及无在途保护。
- 方案：轮询独立任务状态接口，完成后仅刷新当前文档；文档列表不带明细/证据/AI全文。
- 预计占比未知，随正在识别的文档数与正文增长，优先处理避免后续上传后扩大。

### E05 / P1：列表没有真正分页；现有分页页仍附带重复读取

- `src/app/api/material-prices/route.ts:55`、`:61` 与 `src/app/material-prices/page.tsx:760`：GET不接分页或筛选，返回地材全字段+供应商，界面分页无法限制数据库出流。
- `src/app/api/suppliers/route.ts:4`、`:10` 与 `src/app/suppliers/page.tsx:1110`：同样全组织列表+联系人。
- `src/app/ai-price-collection/page.tsx:1296`、`:1345`：同一筛选变化请求列表页和100条分析样本，两次请求的字段和统计有交集；初始bootstrap又先取200条。
- `src/app/api/settings/logs/route.ts:61`、`:82`：虽有15/50分页，每次附加最近1000条审计摘要，列表仍带old_data/new_data全文。
- `src/app/api/analytics/route.ts:329`：limit=5000，设备/地材/线索部分先读组织数据再按所属期处理，metadata未裁剪；不是无限读取，但重复传输可避免。
- 方案：服务端筛选/游标分页；摘要RPC代替拉明细计算；列表剔除metadata正文；原始证据/审计差异按需；分析接口单独返回聚合结果，保持所属期语义和组织权限。
- 预计占比未知。目前供应商仅3条、设备价格约4条，不能把潜在规模风险当成当前GB级主因。重点先改高频被调用接口。

### E06 / P1：全局导航持续扇出查询、失败后保持原频率

- `src/components/layout/AppTopbar.tsx:116`、`:132`：每60秒及focus请求；`src/components/layout/AppSidebar.tsx:44`、`:75`、`:80`：每60秒、路由/参数变化、focus、自定义事件请求。
- `src/app/api/topbar/route.ts:33`、`:146`、`:193`：计数、组织、用户偏好、通知与去重读取；`src/app/api/navigation-counts/route.ts:13` 与部分计数重叠。
- `src/lib/auth/apiAccess.ts:16`：每个API均重新查成员；`src/lib/supabase/proxy.ts:34` 和API都有claims检查，但claims可能本地校验，不能算作每次完整Auth网络下载。
- 方案：共享导航上下文，按组织/用户/权限版本隔离缓存；focus节流；隐藏暂停；401/403/服务限制停止自动重复并提示恢复；不得去掉认证或跨组织共用缓存。
- 预计占比未知；计数使用head:true，返回体小，调用多主要先体现CPU/请求开销。53,213和约22,716次统计支持重复请求事实，不支持把它们直接换算为30GB。

### E07 / P1：Agent发现/upsert频繁，抓取幂等不等于无传输

- `supabase/functions/wpi-price-collector/index.ts:3301`、`:3318`：queued、有字段投影及limit，未发现此处全表无限读；`:3369` 有pageLimit和executionDeadline。
- `:3343` 起队列为空时重新进入seed；`:3390` 起逐URL upsert；后续content_hash/证据去重发生在获取和处理内容之后。累计92,797次发现写操作值得按任务、来源统计。
- `supabase/functions/wpi-equipment-document-worker/index.ts:172` 限1–5项，`:182` CAS领取，`:291` 检查queued，`:295`有条件续跑。不是无条件自递归。
- 当前云端6个Cron启用：采集5分钟、提醒15分钟、陈旧运行10分钟、健康15分钟、每日冒烟、附件30分钟。近7天记录采集2016、提醒672、陈旧运行1008次成功调度。调度成功不等于Agent调用或业务成功，也不等于产生大响应。
- 方案：source URL/内容版本检查、条件请求、批量状态写入、续跑仅处理新queued；返回任务ID和摘要，不返回全文；重复周期任务共享来源内容缓存，保留跨月业务身份与人工审核。
- 占比未知。数据库内部扫描本身不计网络Egress；外部网站向Worker发送PDF也不能直接当作Storage Egress。模型请求携带的正文、Edge返回和数据库API出流须分别核算，避免双计。

### E08 / P2（当前体量）：Storage签名刷新、PDF预检潜在重复下载

- `src/app/api/equipment-catalog/route.ts:199`、`:205`：每次列表对图片逐个生成签名；`src/app/api/attachments/[id]/file/route.ts:16`：预览/下载新签名。
- 签名生成只返回小URL，不等于文件已下载；变化URL可能降低浏览器缓存复用，实际CDN命中须看Storage日志。
- `supabase/functions/wpi-equipment-document-worker/index.ts:67` 发Range bytes=0-7，但`:73`无论返回206或200都arrayBuffer；若来源忽略Range，会完整读PDF，然后模型再次获取同一URL。
- `src/app/api/quote-recognition/[id]/parse/route.ts:85`、`src/app/api/equipment-prices/imports/[id]/parse/route.ts:92`、`src/app/api/project-pricing/[id]/parse/route.ts:15` 有下载解析路径；目前未证明无限重复调用。
- 方案：签名URL按资源版本/权限安全复用到临近过期，缩略图与原件分开，点击才预览；预检验证206并限制读取字节/取消流；解析结果按内容hash复用。不得为缓存而公开私有附件。
- 占比未知，当前水厂Storage只有15,669字节，缺少它主导本周期流量的证据；另一个项目Storage约90MB，需按其请求日志单独核算。

## 十项检查覆盖与未发现项

1. 星号查询：已扫描；区分列表、单行详情、写后回读，见E01–E05。
2. 分页/筛选：存在缺口，也存在正确range/limit，不作“全部没有分页”的结论。
3. 自动轮询：已确认E01–E04、E06；Dashboard存在visibility检查，是正面例外。
4. React依赖：useToast底层useMemo([],...)稳定（`src/hooks/useMockToast.ts`）；未发现上述链路由toast依赖引发无限render-fetch。selected对象重建造成定时器重建，但有清理；多请求重叠仍存在。
5. Realtime：四处创建都找到removeChannel，包括报告库、报告中心、比价页、询价管理；未证实订阅泄漏。报告中心广表订阅导致重载比直接Realtime消息体更值得处理。
6. Agent/Cron：有边界、queued过滤与CAS；无证据所有任务每次全表下载。已指出重复seed与写操作放大风险。
7. Storage：有签名和下载路径，但当前对象小；需要真实下载次数和历史对象账单，不将签名请求视作文件流量。
8. 失败重试：确认定时轮询在失败后保持固定频率（可无限持续），不是同步递归死循环；Worker有时间/批次边界。
9. 重复请求：来源bootstrap与sources重复、列表与分析重叠、导航计数重复；未证实所有页面都有SSR+CSR同数据双取。
10. 缓存/增量/投影：关键接口no-store、正文随列表、状态无增量。分页读取完整数据的设置字典修复也会增加网络读取，后续应改为授权聚合，而不是重新截断结果。

## 流量占比与修改后月度预测

**本周期每项真实占比：目前均无法核定。不给没有依据、凑成100%的比例。**
E01当前代码具有单页GB级放大能力，优先级最高；E02有实测小payload，E08当前存量很小。其余先按请求扇出和业务体积评估，不可叠加有重叠的链路估算。

计算模型：月度GB = 每次Supabase实际出流字节 × 每月请求次数 / 10^9。请求次数必须取日志或明确使用假设；压缩、缓存命中和服务间传输用官方用量校准。

以下为工程容量场景，不是对账单归因，也不是保证值：

- 假设5人，每人每工作日打开设备采集1小时，22个工作日，一人一标签且无后台节流。目前仅938,041字节四部分的5秒刷新：约74.3GB/月，说明5 MAU仍可能高Egress；不是宣称实际发生74.3GB。
- 修复后同样使用时长，假设轻量状态30秒一次、每次总数据库出流不超过60KB：轮询约0.792GB/月；初始化、其他页面、Agent和下载另计。
- 在该场景下，把其他访问、导航、Agent响应和下载控制在合计1.2–4.2GB，可设当前水厂项目总量目标约2–5GB/月。这是待验证预算，不是已经测出的预测。
- 若本周期30.649GB经分项证明全部属于可优化链路，削减70%/85%/90%对应同等周期约9.195/4.597/3.065GB。不能在未完成账单拆分前选择某个比例当结论。
- 组织包含另一个项目，因此组织月度Egress不能由当前代码修复直接预测；若大量消耗来自另一项目，本项目优化后组织仍可能超过5GB。

## 建议实施顺序（均待确认）

1. P0：取得项目/服务分项，定位日尖峰；E01改为轻量、可见、运行中、单在途轮询，保持功能。
2. P1：E02/E04任务状态与正文分离；E03减少订阅触发的全局刷新。
3. P1：列表字段投影、真实分页、服务端聚合；导航共享缓存按权限隔离；所有轮询加入失败退避与请求互斥。
4. P1：Agent按来源版本增量抓取、去重调度、精简响应；不关闭任务、不删证据。
5. P2：Storage预览与签名缓存、Range读取保护、按hash复用解析。
6. 验收：同一代表性流程记录每路由调用数、传输字节、缓存命中、401/429/5xx次数；后台30分钟无自动业务轮询、完成任务不轮询、失败不固定高频重试；使用3–7天官方用量验证月度外推。采样仅记路径模板和字节数，不记录JWT/签名URL/业务正文。

## 官方口径

- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/troubleshooting/all-about-supabase-egress-a_Sg_e
- https://supabase.com/docs/guides/storage/serving/bandwidth

官方说明Egress覆盖Database、Auth、Storage、Edge Functions、Realtime等出流；Storage cached与uncached需要区分。不能用数据库占用或MAU直接反推账单流量。
