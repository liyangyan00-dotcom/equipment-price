# 03 刚果金地材价格 API 草案

## 1. 获取地材价格列表

```http
GET /api/material-prices
```

### Query

```text
page
pageSize
keyword
category
region
currency
transportIncluded
confidenceLevel
reviewStatus
volatilityLevel
dateFrom
dateTo
```

## 2. 获取地材价格详情

```http
GET /api/material-prices/{id}
```

## 3. 新增地材价格

```http
POST /api/material-prices
```

字段参考：

```text
field-dictionary/02_MATERIAL_PRICE_FIELDS.md
```

## 4. 更新地材价格

```http
PATCH /api/material-prices/{id}
```

## 5. 作废地材价格

```http
DELETE /api/material-prices/{id}
```

## 6. 地材价格审核

```http
POST /api/material-prices/{id}/review
```

## 7. 地材趋势

```http
GET /api/material-prices/trends
```

### Query

```text
category
region
dateFrom
dateTo
```

## 8. 地区价格对比

```http
GET /api/material-prices/region-comparison
```
