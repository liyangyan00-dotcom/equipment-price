# 00 API 草案总说明

## 一、定位

本目录是后续接入真实后端前的 API 草案，不要求当前开发阶段立即实现。

当前状态：

> 仅作为后续 Codex / 后端 / Supabase / AI 接口开发的前置规范。

## 二、API 设计目标

API 需要支持：

- 设备价格库；
- 刚果金地材价格库；
- 供应商库；
- AI 报价识别；
- 待审核报价池；
- AI 价格采集；
- 价格线索池；
- 询价与比价；
- 项目套价；
- 附件证据链；
- 统计分析；
- AI 工作台；
- AI 报告中心；
- 系统设置；
- 用户与权限。

## 三、统一约定

### 1. Base URL

```text
/api
```

### 2. 返回结构

```ts
type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
  errorCode?: string
  requestId?: string
}
```

### 3. 分页结构

```ts
type PaginatedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
```

### 4. 错误结构

```ts
type ApiError = {
  success: false
  message: string
  errorCode: string
  details?: unknown
}
```

### 5. 通用查询参数

```text
page
pageSize
keyword
sortBy
sortOrder
dateFrom
dateTo
reviewStatus
confidenceLevel
riskLevel
```

## 四、当前阶段边界

当前阶段不实现真实 API。

Codex 后续前端 mock 阶段可先用：

```text
src/data/mock/
```

正式后端阶段再参考本目录实现 API。
