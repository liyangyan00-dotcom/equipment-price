# 09 附件证据与报告 API 草案

## 2026-09-09 已实现的附件审核安全契约

- `POST /api/attachments/{id}/review` 仅接收 `decision`（confirmed / need_info / rejected）和 5–1000 字 `notes`。拒绝客户端审核身份、审核时间和其他字段。先校验有效审核权限，再按当前组织查附件，最终由 RPC 再次校验。
- `POST /api/attachments/actions` 的 assign 动作接收 1–50 个 UUID 和 `reviewerId`；接收人必须出现在同组织有效审核员列表中。非法 ID、缺失/跨组织/终态记录均失败，不静默截断或部分分派。
- `GET /api/attachments` 的 `reviewers`、`permissions.canReview` 和 `permissions.canAssign` 使用同一数据库权限判定，考虑有效成员状态、角色边界和组织权限覆盖。
- 未认证返回 401，无审核权限返回 403；格式错误返回 400，当前组织内附件不存在返回 404；权限查询失败返回 503；审核准入、状态或分派冲突返回 409。
- 审核 RPC 在同一事务写入审核历史和最终状态，身份绑定 `auth.uid()`；直接 INSERT/UPDATE 不能写终态、审核身份、审核时间、分派身份或保留的审核元数据。
- 文件/关联/资料修改使 `evidence_version` 递增并撤销旧确认；AI `input_snapshot.evidenceVersion` 必须匹配当前版本。历史待审记录缺少版本快照时需要重新运行预审。
- 人工抽取字段 PATCH 使用 `updated_at` 条件更新，竞争写入返回 409。

迁移 `20260909101242_guard_attachment_review_authorization.sql` 尚未应用云端；应用版本和数据库迁移需配套发布。本节记录本地实现，其余章节保留原接口规划。

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
