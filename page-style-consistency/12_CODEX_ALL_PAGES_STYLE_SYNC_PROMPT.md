# 12 交给 Codex 的全页面风格同步提示词

```text
请执行全页面风格一致性同步。

目标：
以 `/dashboard` 首页最终风格为视觉基准，更新其他页面规范与实现要求。注意：继承首页的视觉语言，但不要照搬首页驾驶舱布局。

必须阅读：
1. dashboard-final-constraints/
2. page-style-consistency/
3. visual-design-spec/
4. visual-references/ui-images/
5. acceptance-checklists/

执行原则：
1. 所有页面继承首页的工程蓝、AI紫、风险橙红、浅灰蓝背景、白色圆角卡片、轻阴影；
2. 所有页面优先使用 lucide-react 图标；
3. 所有模块标题使用 IconBox + 标题 + 副标题 + 右侧操作；
4. 所有 AI 页面使用 AI紫、AiBadge、置信度、人工复核；
5. 所有风险模块使用橙红体系；
6. 所有表格页面使用 compact 表格密度；
7. 所有页面执行截图对比；
8. 各页面按 page-style-consistency/01_PAGE_TYPE_CLASSIFICATION.md 选择布局类型；
9. 不要把首页 Row 布局照搬到其他页面；
10. 不新增图片资产，除非对应资产规范明确要求。

请输出：
1. 更新了哪些页面规范；
2. 每个页面采用哪种页面类型；
3. 哪些全局风格从首页继承；
4. 哪些首页布局没有照搬；
5. 后续每轮开发应执行哪个页面类型规范。
```
