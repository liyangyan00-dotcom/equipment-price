# 00 字段字典总说明

## 一、用途

字段字典用于约束后续 Codex 开发时的所有业务字段，避免：

- 页面字段随意命名；
- 表格字段遗漏；
- mock 数据不统一；
- 前端类型和数据库字段不一致；
- AI 输出字段无法入库；
- 后续接 Supabase / API 时返工。

## 二、命名原则

### 前端 TypeScript 字段

使用 camelCase：

```ts
equipmentName
supplierName
reviewStatus
confidenceLevel
```

### 数据库字段

使用 snake_case：

```sql
equipment_name
supplier_name
review_status
confidence_level
```

### 页面中文名称

使用业务人员能理解的中文：

```text
设备名称
供应商名称
审核状态
可信度等级
```

## 三、通用字段规则

所有核心业务对象必须包含：

| 字段 | 说明 |
|---|---|
| id | 唯一ID |
| code | 编号 |
| createdAt | 创建时间 |
| updatedAt | 更新时间 |
| createdBy | 创建人 |
| updatedBy | 更新人 |
| remarks | 备注 |

涉及价格的数据必须包含：

| 字段 | 说明 |
|---|---|
| originalPrice | 原始价格 |
| currency | 币种 |
| usdPrice | 折算美元价格 |
| quoteDate | 报价日期 |
| sourceType | 价格来源 |
| confidenceLevel | 可信度等级 |
| reviewStatus | 审核状态 |
| attachmentIds | 附件证据 |

涉及 AI 的数据必须包含：

| 字段 | 说明 |
|---|---|
| aiConfidence | AI置信度 |
| aiStatus | AI状态 |
| missingFields | 缺失字段 |
| riskNotes | 风险提示 |
| suggestedActions | 建议动作 |
| needHumanReview | 是否需要人工复核 |
