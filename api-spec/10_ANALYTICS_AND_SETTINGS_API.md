# 10 统计分析与系统设置 API 草案

## 统计分析 API

### 1. 首页统计

```http
GET /api/analytics/dashboard
```

### 2. 价格趋势

```http
GET /api/analytics/price-trends
```

### 3. 供应商分布

```http
GET /api/analytics/supplier-distribution
```

### 4. 可信度分布

```http
GET /api/analytics/confidence-distribution
```

### 5. 风险清单

```http
GET /api/analytics/risk-list
```

## 系统设置 API

### 1. 获取汇率

```http
GET /api/settings/currency-rates
```

### 2. 更新汇率

```http
PATCH /api/settings/currency-rates/{currency}
```

### 3. 获取分类

```http
GET /api/settings/categories
```

### 4. 更新分类

```http
PATCH /api/settings/categories
```

### 5. 获取可信度规则

```http
GET /api/settings/confidence-rules
```

### 6. 更新可信度规则

```http
PATCH /api/settings/confidence-rules
```

### 7. 获取 AI 参数

```http
GET /api/settings/ai
```

### 8. 更新 AI 参数

```http
PATCH /api/settings/ai
```
