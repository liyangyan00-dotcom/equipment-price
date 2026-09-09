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

### 2026-09-06 当前实现补充

本节记录当前本地实现；不代表原草案所有端点已经上线。编辑与人工审核目前共用上述 PATCH，原草案第6节的独立审核路径不作为已实现承诺。

- 所有 PATCH 必须携带 `expectedUpdatedAt`，原样使用 GET 列表/详情返回的 `updated_at`。该值作为版本标识，不格式化、不截断微秒、不使用客户端当前时间代替。
- 编辑传业务字段及 `action: draft | submit_review`，允许角色为admin、manager、editor。修改已审核价格后，分别回到draft或pending_review；当前审核字段清空，历史审计与来源证据保留。
- 人工审核传 `decision: approve | need_info | reject`、非空 `comment` 及 `expectedUpdatedAt`，允许角色为admin、manager、reviewer。仅draft或pending_review可审核；已归档记录不可修改。
- 通过审核前检查名称、规格、单位、币种、地区、来源、供应商、正数价格、有效日历报价日期及有效期。报价日期不能晚于北京时间当天，有效期不能早于报价日期。字段通过不等于原始证据真实性已经自动确认，仍需人工核验。
- 非法JSON/决定/动作/字段返回400；未登录401；不允许的角色403；找不到本组织记录404；版本冲突或非法状态409；缺少有效版本428。更新SQL同时匹配组织、ID、读取版本及审核状态，零行更新不返回假成功。
- 页面必须保留冲突前的人工意见并要求刷新核对，不自动用最新版本重放旧操作。只有服务器返回同一记录ID和预期结果后才能展示成功。
- 此API校验不替代Data API、RPC、数据库RLS/触发器的权限控制；相关云端保护尚待独立验收。

### 未知值保存约定（草稿/待审核）

- `usdPrice`、`confidence`允许null，表示未知，不代表0；不得为满足历史Mock字段必填要求补造汇率、折算价或置信度。真实已确认报价的完整性与证据要求仍须单独验收。
- POST不再默认提供CNY或60%可信度，币种必须明确提交；缺少报价日期保留null，来源/运输条件缺失不补造。
- PATCH省略上述可空数值字段时保留已存值，明确传null时清空；有效0保留。数据库原始confidence不等同于有模型执行证据的AI置信度。
- 表单“检查资料”仅为本地规则，不发起模型任务或生成“AI预审完成”；现有AI补充采集入口与模型表单预审是不同能力。

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
