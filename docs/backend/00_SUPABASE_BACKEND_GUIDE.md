# Supabase 后端基础说明

## 已建立能力

- 独立 Supabase 项目：`水厂价格库系统`（ref: `tkyvafheqyshbjqnzbgq`）。
- Supabase Auth：邮箱密码注册、登录、会话刷新、退出和受保护路由。
- PostgreSQL：以 `wpi_` 为前缀的独立业务表，避免影响同项目已有招投标数据。
- RBAC：`admin / manager / reviewer / editor / viewer` 五级角色和 19 项业务权限。
- RLS：所有 `wpi_` 表均启用行级安全，按组织与权限隔离数据。
- 审计日志：核心业务表的新增、修改、删除自动写入 `wpi_audit_logs`。
- 文件存储：`business-documents`、`report-exports` 两个私有桶，路径首段必须是组织 ID。

## 环境变量

复制 `.env.example` 为 `.env.local` 并配置：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

发布密钥可以进入浏览器；禁止把 Supabase secret/service role key 放进
`NEXT_PUBLIC_` 环境变量。

## 首次使用

1. 打开 `/login` 注册账户。
2. 如果项目启用了邮箱确认，先完成邮件验证。
3. 首次成功登录会调用 `wpi_bootstrap_account()`，创建个人工作组并授予 `admin`。
4. 后续成员应由管理员加入 `wpi_organization_members` 并分配角色。

## 文件路径规则

```text
{organization_id}/{category}/{uuid}-{safe_file_name}
```

私有文件必须通过短时 signed URL 下载。不要保存公开 URL。

## 业务接入顺序

当前迁移建立了正式后端底座，但既有页面仍有大量 Mock 状态。建议依次迁移：

1. 供应商与联系人；
2. 设备、地材价格；
3. 询价、询价明细和供应商响应；
4. 项目套价和报告；
5. 附件元数据与审计查询。

每个页面迁移时应保留现有 UI，只把数据源从 Mock store 切换到 `wpi_` 表。

## 安全说明

价格库系统已经迁移到独立 Supabase 项目，不再与招标雷达共用数据库、Auth 或 Storage。
原项目中的 `wpi_` 结构暂时保留作为迁移回退，确认新项目稳定后可单独清理。
