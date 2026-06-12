# 32 Codex 分轮执行索引

## 一、首次交接

使用：

```text
docs/30_FINAL_CODEX_HANDOFF_PROMPT.md
```

或：

```text
codex-prompts/00_CODEX_HANDOFF_MASTER_PROMPT.md
```

## 二、分轮执行

| 轮次 | 文件 | 目标 |
|---:|---|---|
| 0 | `codex-prompts/00_CODEX_HANDOFF_MASTER_PROMPT.md` | 让 Codex 先理解项目 |
| 1 | `codex-prompts/01_ROUND_PROJECT_INIT.md` | 项目初始化 |
| 2 | `codex-prompts/02_ROUND_DESIGN_TOKENS_AND_LAYOUT.md` | 设计系统与布局 |
| 3 | `codex-prompts/03_ROUND_COMPONENT_LIBRARY.md` | 基础组件库 |
| 4 | `codex-prompts/04_ROUND_DASHBOARD_AND_LOGIN.md` | 首页与登录页 |
| 5 | `codex-prompts/05_ROUND_PRICE_LIBRARY_PAGES.md` | 价格库核心页面 |
| 6 | `codex-prompts/06_ROUND_AI_WORKFLOW_PAGES.md` | AI报价与采集 |
| 7 | `codex-prompts/07_ROUND_PROJECT_PRICING_AND_REPORTS.md` | 询价、比价、套价、报告 |
| 8 | `codex-prompts/08_ROUND_SETTINGS_AND_PERMISSIONS.md` | 设置、统计、附件、权限 |
| 9 | `codex-prompts/09_ROUND_MOCK_API_AND_DATA_BINDING.md` | Mock API与数据绑定 |
| 10 | `codex-prompts/10_ROUND_FINAL_ACCEPTANCE_AND_FIX.md` | 最终验收与修复 |

## 三、每轮结束后必须做

每轮结束后要求 Codex 输出：

```text
1. 本轮完成内容
2. 修改文件清单
3. 尚未完成内容
4. 是否违反禁止事项
5. 对照验收表的自查结果
6. 下一轮建议
```

## 四、出现偏差时怎么处理

如果 Codex 开始乱做，立即要求它读取：

```text
codex-prompts/11_DO_NOT_DO_LIST.md
acceptance-checklists/00_ACCEPTANCE_OVERVIEW.md
visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
```

## V4.6 补充：Round 2 / Round 3 执行前置条件

执行 Round 2 前必须确认：

```text
visual-design-spec/ 已合并
codex-prompts/02_ROUND_DESIGN_TOKENS_AND_LAYOUT.md 已是 V4.6 视觉增强版
```

执行 Round 3 前必须确认：

```text
codex-prompts/03_ROUND_COMPONENT_LIBRARY.md 已是 V4.6 视觉增强版
acceptance-checklists/01_GLOBAL_UI_ACCEPTANCE.md 已是 V4.6 视觉增强版
```

## V4.7 补充：Round 4.1 首页补强

Round 4 完成后，如首页信息密度不足，应先执行：

```text
dashboard-enhancement/06_ROUND_4_1_CODEX_PROMPT.md
```

自查通过后，再进入 Round 5。

## V4.8 补充：Round 4.2 Dashboard 像素复刻修正

当 `/dashboard` 已完成基础实现，但与参考图仍差异明显时，应先执行：

```text
dashboard-pixel-restore/08_ROUND_4_2_PIXEL_RESTORE_CODEX_PROMPT.md
```

然后执行：

```text
dashboard-pixel-restore/10_ROUND_4_2_SELF_CHECK_PROMPT.md
```

并结合截图对比清单继续修正，之后再考虑进入 Round 5。

## V4.9 补充：Round 4.3 Dashboard 细节精修

如 Round 4.2 后首页仍与参考图存在明显细节差异，执行：

```text
dashboard-pixel-restore/17_ROUND_4_3_FINE_TUNING_CODEX_PROMPT.md
```

最终验收：

```text
dashboard-pixel-restore/18_ROUND_4_3_FINAL_ACCEPTANCE_PROMPT.md
```

只有不存在 `dashboard-pixel-restore/16_DASHBOARD_NO_ROUND5_BLOCKERS.md` 中的阻断条件时，才允许进入 Round 5。

## V5.0 补充：进入 Round 5 前的风格同步

在进入价格库页面开发前，必须先确认：

```text
dashboard-final-constraints/
page-style-consistency/
```

已合并并被 Codex 读取。

后续页面开发不再直接照搬首页，而是按 `page-style-consistency/01_PAGE_TYPE_CLASSIFICATION.md` 选择页面类型。
