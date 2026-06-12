# 05 AI报价识别与待审核报价 API 草案

## 1. 上传报价文件

```http
POST /api/quote-files/upload
```

### Content-Type

```text
multipart/form-data
```

## 2. 创建 AI 报价识别任务

```http
POST /api/ai/quote-recognition
```

### Request

```json
{
  "fileId": "att_001",
  "quoteType": "equipment"
}
```

## 3. 获取 AI 识别结果

```http
GET /api/ai/tasks/{taskId}
```

## 4. 保存到待审核报价池

```http
POST /api/pending-quotes
```

## 5. 获取待审核报价列表

```http
GET /api/pending-quotes
```

### Query

```text
page
pageSize
quoteType
supplierName
reviewStatus
riskLevel
dateFrom
dateTo
```

## 6. 获取待审核报价详情

```http
GET /api/pending-quotes/{id}
```

## 7. 人工修正待审核报价

```http
PATCH /api/pending-quotes/{id}
```

## 8. 确认入库

```http
POST /api/pending-quotes/{id}/confirm
```

### Request

```json
{
  "targetType": "equipment_price",
  "confidenceLevel": "B",
  "reviewNotes": "已核对供应商报价"
}
```

## 9. 标记需补充

```http
POST /api/pending-quotes/{id}/need-info
```

## 10. 作废

```http
POST /api/pending-quotes/{id}/void
```
