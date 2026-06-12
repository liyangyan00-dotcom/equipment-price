# 09 枚举与状态码字典

## 价格可信度 confidenceLevel

| 值 | 中文 | 说明 |
|---|---|---|
| A | 高 | 正式盖章报价单、正式邮件报价 |
| B | 较高 | 供应商邮件、WhatsApp确认、历史成交价 |
| C | 一般 | 官网、平台、公开网页价格 |
| D | 较低 | AI自动搜索结果、网页线索 |
| E | 低 | 过期历史价格、无来源价格 |

## 审核状态 reviewStatus

| 值 | 中文 |
|---|---|
| pending | 待审核 |
| need_info | 需补充 |
| confirmed | 已确认 |
| rejected | 已退回 |
| voided | 已作废 |

## 风险等级 riskLevel

| 值 | 中文 |
|---|---|
| low | 低 |
| medium | 中 |
| high | 高 |
| critical | 严重 |

## AI任务类型 taskType

| 值 | 中文 |
|---|---|
| quote_recognition | 报价识别 |
| equipment_parse | 设备参数解析 |
| material_parse | 地材调研整理 |
| supplier_match | 供应商匹配 |
| price_collection | 价格采集 |
| comparison_analysis | 比价分析 |
| project_pricing | 项目套价 |
| risk_detection | 风险检测 |
| report_generation | 报告生成 |
| evidence_linking | 证据链关联 |

## AI任务状态 aiTaskStatus

| 值 | 中文 |
|---|---|
| created | 已创建 |
| running | 运行中 |
| completed | 已完成 |
| needs_review | 待人工复核 |
| needs_info | 需补充资料 |
| confirmed | 已确认 |
| rejected | 已退回 |
| voided | 已作废 |

## 价格条件 priceCondition

| 值 | 说明 |
|---|---|
| EXW | 工厂交货 |
| FOB | 离岸价 |
| CIF | 到港价 |
| DDP | 完税后交货 |
| SITE | 现场交货 |
| LOCAL_PICKUP | 本地自提 |
| LOCAL_DELIVERY | 本地送货 |
