# 11 API 实现注意事项

## 一、当前不实现

当前阶段只保留 API 草案，不实现后端接口。

## 二、后续推荐实现路线

### 第一阶段：前端 Mock

```text
页面直接读取 src/data/mock/*.ts
```

### 第二阶段：Next.js Route Handlers Mock API

```text
src/app/api/**/route.ts
```

用于模拟真实接口。

### 第三阶段：Supabase 接入

- PostgreSQL 表；
- Storage 文件；
- Auth 权限；
- RLS 策略。

### 第四阶段：AI API 接入

- 报价识别；
- BOQ 解析；
- 比价分析；
- 套价匹配；
- 报告生成。

## 三、接口安全要求

1. 上传文件必须限制格式；
2. AI接口必须记录原始输入和输出；
3. 人工确认必须记录审核日志；
4. 删除应优先软删除；
5. 导出报告应记录导出人和时间；
6. 价格入库必须经过审核状态。
