# 17 Round 4.3 Dashboard 细节精修 Codex 提示词

```text
请执行 Round 4.3 Dashboard 细节精修。

背景：
Round 4.2 已经完成 Dashboard 红线布局复刻，但为了更接近参考图，需要继续细化模块内部结构、组件紧凑变体、标题图标系统和截图差异闭环。

本轮只允许修改：
1. `/dashboard`；
2. Dashboard 局部组件；
3. Dashboard mock 数据；
4. Dashboard 相关样式；
5. 必要时增加 compact/dashboard 组件变体。

本轮禁止：
1. 不开发其他业务页面；
2. 不进入 Round 5；
3. 不接真实数据库；
4. 不接真实 AI API；
5. 不新增生图资产；
6. 不使用图片代替图表、表格、按钮、卡片、状态标签。

必须阅读：
1. dashboard-pixel-restore/11_DASHBOARD_MODULE_INTERNAL_STRUCTURE_SPEC.md
2. dashboard-pixel-restore/12_DASHBOARD_COMPONENT_PATCH_SPEC.md
3. dashboard-pixel-restore/13_DASHBOARD_MODULE_HEADER_SPEC.md
4. dashboard-pixel-restore/14_DASHBOARD_IMPLEMENTATION_GUARDRAILS.md
5. dashboard-pixel-restore/15_DASHBOARD_SCREENSHOT_DIFF_WORKFLOW.md
6. dashboard-pixel-restore/16_DASHBOARD_NO_ROUND5_BLOCKERS.md
7. dashboard-pixel-restore/09_ROUND_4_2_SCREENSHOT_COMPARE_CHECKLIST.md

执行任务：
1. 为 Dashboard 建立或完善 DashboardSectionHeader；
2. 统一模块标题图标容器；
3. 为 StatCard 增加 compact 形态，或在 Dashboard 中使用紧凑样式；
4. 为 ChartCard / DataTable / AiInsightCard 使用 Dashboard 紧凑形态；
5. 优化最新价格动态每一行字段结构；
6. 优化待复核任务每一行字段结构；
7. 优化风险预警每一行字段结构；
8. 优化快捷操作栏单项结构；
9. 清理 page.tsx，避免超长堆叠；
10. 生成或说明截图对比结果；
11. 检查不得进入 Round 5 的阻断条件。

完成后请输出：
1. 修改文件清单；
2. 新增或调整的 compact/dashboard 组件变体；
3. DashboardSectionHeader 使用情况；
4. 图标 lucide-react 映射表；
5. 截图对比差异表；
6. 未解决问题；
7. 是否仍被 Round 5 blocker 阻断；
8. 是否可以进入 Round 5。
```
