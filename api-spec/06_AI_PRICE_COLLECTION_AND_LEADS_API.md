# 06 AI价格采集与价格线索 API 草案

## 1. 创建 AI 价格采集任务

```http
POST /api/ai/price-collection/tasks
```

### Request

```json
{
  "leadType": "equipment",
  "itemName": "潜水排污泵",
  "specification": "Q=200m3/h,H=20m",
  "targetRegion": "Kinshasa",
  "currency": "USD"
}
```

## 2. 获取采集任务列表

```http
GET /api/ai/price-collection/tasks
```

## 3. 获取价格线索池

```http
GET /api/price-leads
```

### Query

```text
page
pageSize
leadType
keyword
region
sourceType
status
riskLevel
confidenceSuggestion
```

## 4. 获取价格线索详情

```http
GET /api/price-leads/{id}
```

## 5. 人工确认线索并入库

```http
POST /api/price-leads/{id}/confirm
```

### Request

```json
{
  "targetType": "material_price",
  "confidenceLevel": "C",
  "reviewNotes": "已电话确认"
}
```

## 6. 作废价格线索

```http
POST /api/price-leads/{id}/void
```

## 7. 批量转询价

```http
POST /api/price-leads/batch-create-inquiry
```
