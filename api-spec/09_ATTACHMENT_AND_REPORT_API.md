# 09 附件证据与报告 API 草案

## 附件 API

### 1. 上传附件

```http
POST /api/attachments/upload
```

### 2. 获取附件列表

```http
GET /api/attachments
```

### Query

```text
page
pageSize
fileType
relatedType
supplierId
status
dateFrom
dateTo
```

### 3. 获取附件详情

```http
GET /api/attachments/{id}
```

### 4. 关联附件到价格/供应商/报告

```http
POST /api/attachments/{id}/link
```

### 5. 标记附件无效

```http
POST /api/attachments/{id}/invalidate
```

## 报告 API

### 1. 获取报告列表

```http
GET /api/reports
```

### 2. 创建 AI 报告生成任务

```http
POST /api/reports/ai-generate
```

### Request

```json
{
  "reportType": "equipment_analysis",
  "projectName": "刚果金恩吉利水厂项目",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-06-10",
  "includeRisk": true,
  "includeAttachments": true
}
```

### 3. 获取报告详情

```http
GET /api/reports/{id}
```

### 4. 更新报告正文

```http
PATCH /api/reports/{id}
```

### 5. 导出报告

```http
GET /api/reports/{id}/export
```
