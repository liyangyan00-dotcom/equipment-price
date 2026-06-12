# 09 AI Agent 编排规范

## 一、AI Agent 类型

系统可拆分为多个 AI Agent：

| Agent | 职责 |
|---|---|
| QuoteRecognitionAgent | 报价单识别 |
| EquipmentParseAgent | 设备参数结构化 |
| MaterialResearchAgent | 地材调研整理 |
| SupplierMatchAgent | 供应商匹配 |
| PriceCollectionAgent | 价格线索采集 |
| ComparisonAgent | 比价分析 |
| ProjectPricingAgent | BOQ套价 |
| RiskDetectionAgent | 风险识别 |
| ReportAgent | 报告生成 |
| EvidenceAgent | 证据链整理 |

## 二、Agent 协作流程示例

### 报价单入库

QuoteRecognitionAgent  
→ RiskDetectionAgent  
→ EvidenceAgent  
→ 人工复核  
→ 正式入库。

### BOQ 套价

EquipmentParseAgent  
→ ProjectPricingAgent  
→ SupplierMatchAgent  
→ RiskDetectionAgent  
→ ReportAgent。

### 比价分析

QuoteRecognitionAgent  
→ ComparisonAgent  
→ RiskDetectionAgent  
→ ReportAgent。

## 三、统一输出要求

所有 Agent 输出必须包含：

- result；
- confidence；
- missing_fields；
- risk_notes；
- suggested_actions；
- source_refs；
- need_human_review。
