# 08 Round 4.2 Dashboard 像素复刻 Codex 提示词

```text
请执行一个修正小轮次：Round 4.2 Dashboard 参考图像素级复刻修正。

当前问题：
/dashboard 虽然已有统计卡、趋势图、AI洞察、待复核任务、风险预警、快捷入口等模块，但整体布局逻辑、模块比例、信息密度、图标与标题系统、视觉节奏仍与参考图 `visual-references/ui-images/01_dashboard_ai_price_intelligence.png` 存在明显差异。

本轮目标：
不要自由发挥，不要只按业务模块堆叠，而是以参考图为主，对 `/dashboard` 做一次“布局复刻 + 视觉调优 + 差异修正”。

本轮只允许修改：
1. `/dashboard` 页面；
2. Dashboard 相关局部组件；
3. Dashboard mock 数据；
4. 与 Dashboard 相关的样式；
5. 必要时微调通用组件的尺寸参数，但不得破坏其他页面。

本轮禁止：
1. 不开发其他业务页面；
2. 不进入 Round 5；
3. 不接真实数据库；
4. 不接真实 AI API；
5. 不做真实上传；
6. 不使用整页切图；
7. 不使用图片代替图表、表格、按钮、卡片、状态标签；
8. 不删除规范目录；
9. 不重写整个项目结构；
10. 不改变 Round 2 的 AppLayout 主框架。

必须阅读：
1. dashboard-pixel-restore/00_DASHBOARD_REFERENCE_ANALYSIS.md
2. dashboard-pixel-restore/01_DASHBOARD_REDLINE_LAYOUT.md
3. dashboard-pixel-restore/02_DASHBOARD_MODULE_POSITION_MAP.md
4. dashboard-pixel-restore/03_DASHBOARD_DENSITY_AND_SIZE_RULES.md
5. dashboard-pixel-restore/04_DASHBOARD_VISUAL_TUNING_SPEC.md
6. dashboard-pixel-restore/05_DASHBOARD_ICON_AND_TITLE_SYSTEM.md
7. dashboard-pixel-restore/06_DASHBOARD_CURRENT_GAP_CHECKLIST.md
8. dashboard-pixel-restore/07_DASHBOARD_ASSET_NEED_DECISION.md
9. dashboard-pixel-restore/09_ROUND_4_2_SCREENSHOT_COMPARE_CHECKLIST.md
10. visual-references/ui-images/01_dashboard_ai_price_intelligence.png
11. dashboard-enhancement/05_DASHBOARD_ACCEPTANCE_CHECKLIST.md
12. visual-design-spec/14_CODEX_VISUAL_IMPLEMENTATION_CHECKLIST.md

执行要求：
1. 按红线布局重排首页；
2. 压缩顶部 6 张统计卡高度；
3. 稳定“趋势图 + AI工作台”主次关系；
4. 把“最新价格动态 + 待复核任务”做成运营流模块；
5. 把 AI 洞察三联卡做得更紧凑、更像智能建议区；
6. 把分布图做成次级分析模块；
7. 把风险预警做成列表式问题运营面板；
8. 把快捷入口做成横向工具栏；
9. 全面统一图标容器、标题、副标题、badge 的视觉系统；
10. 图标优先使用 lucide-react，不单独生成图片；
11. 如 mock 数据不足，仅补充 Dashboard 专用 mock 数据。

完成后请输出：
1. 修改了哪些文件；
2. 当前布局如何对应红线布局；
3. 修复了差异清单中的哪些项；
4. 哪些通用组件被微调；
5. 是否坚持图标优先使用 lucide-react；
6. 是否未生成新图片；
7. 是否只修改了 `/dashboard`；
8. 是否可以进入截图对比修正。
```
