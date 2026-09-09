# Codex 页面骨架提示词

## 1. 当前适用范围

当前页面总账包含 50 个已存在页面模板。当前已批准的 P0 / P1 路由已经全部完成；只有未来在 `03_MISSING_PAGE_BACKLOG.md` 重新批准路由且对应开发轮次已经开始时，才可使用本提示词新增页面骨架。

Round 9A.1 只同步文档，不执行本提示词，不创建页面。

## 2. 已规划页面

当前无待开发的已批准独立页面。

## 3. 新增页面前置检查

1. 检查目标路由是否已存在。
2. 检查功能是否可由 Drawer / Modal / Panel 承载。
3. 检查是否会与现有页面重复。
4. 明确上级页面和进入入口。
5. 明确返回路径和动态 ID 来源。
6. 明确页面只做骨架还是完整业务实现。
7. 同一轮原则上只处理一个页面族。

## 4. 推荐提示词

```text
请为当前项目新增一个经过页面总账批准的页面骨架。

目标路由：
<填写已批准的 P1 路由>

页面名称：
<填写页面名称>

上级页面：
<填写入口路由>

返回路径：
<填写返回路由>

页面定位：
<说明页面解决的独立业务问题，以及为什么不能使用 Drawer / Modal>

页面层级：
二级 / 三级

页面类型：
Table数据管理型 / Detail详情证据型 / Form创建编辑型 /
Import工作流型 / Review工作流型 / AI工作流型 /
Report报告型 / Settings配置型

要求：
1. 使用统一 AppLayout；
2. 使用统一 PageHeader / ModuleHeader / IconBox；
3. 继承首页最终颜色、卡片、阴影、字体和密度；
4. 不照搬 Dashboard 驾驶舱布局；
5. 明确页面入口、返回路径和动态 ID；
6. 只实现本轮批准的范围；
7. 不新增图片资产；
8. 不修改无关页面；
9. 不删除现有路由；
10. 不创建与现有页面重复的功能；
11. 必须通过 TypeScript、ESLint 和 build；
12. 完成后同步 docs/page-map。
```

## 5. 骨架结构建议

### 创建 / 编辑页面

```text
PageHeader
RouteContextBanner
FormSections
EvidenceOrAiPanel
ValidationSummary
BottomActionBar
```

### 导入 / 任务页面

```text
PageHeader
StepIndicator
UploadOrTaskSummary
MappingOrProgressPanel
ResultTable
ErrorAndReviewPanel
BottomActionBar
```

### 审核 / 设置页面

```text
PageHeader
StatsSummary
FilterBar
QueueOrConfigTable
RightReviewPanel
AuditTimeline
BottomActionBar
```

## 6. 验收要求

1. 路由可访问且无白屏。
2. 上级页面有明确入口。
3. 动态路由使用有效 mock 或真实 ID。
4. 返回动作正确。
5. Sidebar 不出现重复一级入口。
6. 页面风格与现有系统一致。
7. 不存在空按钮和错误兜底 Drawer。
8. TypeScript、ESLint 和 build 通过。
9. 页面总数和状态同步更新。
