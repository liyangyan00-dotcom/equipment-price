# 04 供应商 API 草案

## 1. 获取供应商列表

```http
GET /api/suppliers
```

### Query

```text
page
pageSize
keyword
country
supplierType
mainProduct
deliveryRisk
priceLevel
technicalLevel
reviewStatus
```

## 2. 获取供应商详情

```http
GET /api/suppliers/{id}
```

## 3. 新增供应商

```http
POST /api/suppliers
```

字段参考：

```text
field-dictionary/03_SUPPLIER_FIELDS.md
```

## 4. 更新供应商

```http
PATCH /api/suppliers/{id}
```

## 5. 停用供应商

```http
DELETE /api/suppliers/{id}
```

## 6. 获取供应商历史报价

```http
GET /api/suppliers/{id}/price-history
```

## 7. AI供应商推荐

```http
POST /api/suppliers/ai-recommend
```

### Request

```json
{
  "itemName": "电动蝶阀",
  "category": "阀门设备",
  "specification": "DN600 PN10",
  "targetCountry": "DRC"
}
```
