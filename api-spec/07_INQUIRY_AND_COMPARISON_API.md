# 07 询价与比价 API 草案

## 1. 获取询价任务列表

```http
GET /api/inquiries
```

## 2. 创建询价任务

```http
POST /api/inquiries
```

### Request

```json
{
  "title": "M2滤池水泵与阀门询价",
  "projectName": "刚果金恩吉利水厂项目",
  "equipmentItems": [],
  "supplierIds": ["sup_001", "sup_002"],
  "deadline": "2026-06-20"
}
```

## 3. 获取询价详情

```http
GET /api/inquiries/{id}
```

## 4. 更新询价任务

```http
PATCH /api/inquiries/{id}
```

## 5. 上传供应商报价

```http
POST /api/inquiries/{id}/quotes/upload
```

## 6. 生成比价表

```http
POST /api/inquiries/{id}/generate-comparison
```

## 7. 获取比价表详情

```http
GET /api/comparisons/{id}
```

## 8. AI比价分析

```http
POST /api/comparisons/{id}/ai-analysis
```

## 9. 导出比价表

```http
GET /api/comparisons/{id}/export
```
