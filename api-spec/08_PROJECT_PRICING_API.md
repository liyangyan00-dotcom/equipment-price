# 08 项目套价 API 草案

## 1. 上传 BOQ

```http
POST /api/project-pricing/boq/upload
```

## 2. AI解析 BOQ

```http
POST /api/project-pricing/boq/{fileId}/ai-parse
```

## 3. 创建项目套价

```http
POST /api/project-pricing
```

## 4. 获取项目套价列表

```http
GET /api/project-pricing
```

## 5. 获取项目套价详情

```http
GET /api/project-pricing/{id}
```

## 6. 自动匹配价格库

```http
POST /api/project-pricing/{id}/match-prices
```

### Request

```json
{
  "matchStrategy": "confidence_first",
  "currency": "USD"
}
```

## 7. 手动选择价格

```http
PATCH /api/project-pricing/{id}/items/{itemId}/select-price
```

## 8. 无匹配项生成询价任务

```http
POST /api/project-pricing/{id}/create-inquiry-from-unmatched
```

## 9. 导出套价表

```http
GET /api/project-pricing/{id}/export
```

## 10. AI生成成本测算报告

```http
POST /api/project-pricing/{id}/ai-cost-report
```
