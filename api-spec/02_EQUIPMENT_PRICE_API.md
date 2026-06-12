# 02 机电设备价格 API 草案

## 1. 获取设备价格列表

```http
GET /api/equipment-prices
```

### Query

```text
page
pageSize
keyword
category
supplierId
currency
confidenceLevel
reviewStatus
riskLevel
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 128
  }
}
```

## 2. 获取设备价格详情

```http
GET /api/equipment-prices/{id}
```

## 3. 新增设备价格

```http
POST /api/equipment-prices
```

### Request

字段参考：

```text
field-dictionary/01_EQUIPMENT_PRICE_FIELDS.md
```

## 4. 更新设备价格

```http
PATCH /api/equipment-prices/{id}
```

## 5. 删除 / 作废设备价格

```http
DELETE /api/equipment-prices/{id}
```

建议实际实现为软删除或 `reviewStatus = voided`。

## 6. 设备价格审核

```http
POST /api/equipment-prices/{id}/review
```

### Request

```json
{
  "reviewStatus": "confirmed",
  "confidenceLevel": "A",
  "reviewNotes": "附件完整，可入库"
}
```

## 7. 导入设备价格

```http
POST /api/equipment-prices/import
```

## 8. 导出设备价格

```http
GET /api/equipment-prices/export
```

## 9. AI相似价格推荐

```http
POST /api/equipment-prices/ai-similar-match
```

### Request

```json
{
  "equipmentName": "反冲洗水泵",
  "specification": "Q=500m3/h,H=45m"
}
```
