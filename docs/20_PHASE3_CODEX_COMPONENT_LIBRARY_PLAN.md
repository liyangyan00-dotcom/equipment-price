# 20 第三阶段 Codex 组件库搭建计划（暂缓执行版）

## 一、当前状态

截至 V4.1，项目仍处于“规范文档与资产准备阶段”。

当前已经完成：

1. 第一阶段 Image2 图片资产归档；
2. 第二阶段 SVG / Logo / 图标资产归档；
3. 28 页 UI 页面参考图归档；
4. UI 100% 还原规则；
5. Image2 / SVG / 前端代码使用边界规则。

第三阶段“Codex 搭建前端组件库”暂不执行。

## 二、为什么暂缓

为了避免 Codex 过早进入编码，导致：

- 组件命名不统一；
- 页面风格偏离参考图；
- 资产路径未统一；
- 还原规则未完全吸收；
- 业务字段遗漏；
- 后续返工成本高。

因此当前只补齐规范要求、资产清单和开发前置说明。

## 三、第三阶段后续才启动的内容

等正式交给 Codex 时，再启动以下内容：

### 1. Layout 组件

```text
src/components/layout/AppSidebar.tsx
src/components/layout/AppTopbar.tsx
src/components/layout/AppLayout.tsx
src/components/layout/PageHeader.tsx
```

### 2. 基础业务组件

```text
src/components/common/StatCard.tsx
src/components/common/StatusBadge.tsx
src/components/common/ConfidenceBadge.tsx
src/components/common/RiskBadge.tsx
src/components/common/AiBadge.tsx
src/components/common/FilterBar.tsx
src/components/common/DataTable.tsx
```

### 3. AI 组件

```text
src/components/ai/AiInsightCard.tsx
src/components/ai/AiRiskPanel.tsx
src/components/ai/AiTaskFlow.tsx
src/components/ai/AiConfidenceBar.tsx
src/components/ai/AiSuggestionList.tsx
src/components/ai/AiReviewPanel.tsx
```

### 4. 图表组件

```text
src/components/charts/TrendLineChart.tsx
src/components/charts/DonutChartCard.tsx
src/components/charts/BarRankingChart.tsx
src/components/charts/RadarScoreChart.tsx
src/components/charts/Sparkline.tsx
```

### 5. 弹窗和表单组件

```text
src/components/dialogs/UploadQuoteDialog.tsx
src/components/dialogs/CreatePriceDialog.tsx
src/components/dialogs/ConfirmEntryDialog.tsx
src/components/dialogs/RiskWarningDialog.tsx
```

## 四、当前只保留的 Codex 前置要求

当前阶段只要求 Codex 后续开发前必须阅读：

```text
AGENTS.md
README.md
docs/16_PHASE1_IMAGE_ASSET_CHECKLIST.md
docs/18_PHASE2_SVG_ICON_ASSET_CHECKLIST.md
visual-references/09_UI_REFERENCE_IMAGE_INDEX_28P.md
visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
asset-rules/00_ASSET_USAGE_DECISION_TREE.md
asset-rules/04_PAGE_BY_PAGE_ASSET_MATRIX.md
assets/svg-icons/README.md
assets/illustrations/README.md
assets/backgrounds/README.md
```

## 五、正式交给 Codex 时再使用的启动提示词

以下提示词暂时不执行，仅作为后续备用：

```text
请开始第三阶段：搭建前端组件库。
要求使用 Next.js + TypeScript + Tailwind CSS + shadcn/ui。
优先使用 lucide-react。
项目 Logo 使用 assets/svg-icons/logo_water_price_system.svg。
Image2 资产只用于背景和插图。
页面主体、表格、图表、按钮、标签必须用代码实现。
组件风格必须贴近 28 页 UI 参考图。
```

## 六、当前阶段结论

当前阶段不做代码，不搭组件库。

只完成：

- 规范文档补齐；
- 资产归档；
- 命名规则；
- 使用边界；
- 后续 Codex 开发前置说明。
