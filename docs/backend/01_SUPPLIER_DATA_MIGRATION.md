# 供应商数据迁移

## 当前结果

- 独立 Supabase 项目：`tkyvafheqyshbjqnzbgq`
- 已迁移供应商：33 家
- 已写入主要联系人：29 家
- 默认审核状态：`pending_review`
- 询价准入：默认关闭，必须完成人工复核

## 重复执行

脚本按 `organization_id + supplier_code` 执行 upsert，并把前端业务路由 ID
保存为 `legacy_id`。

```powershell
$env:SUPABASE_SEED_EMAIL="<管理员邮箱>"
$env:SUPABASE_SEED_PASSWORD="<管理员密码>"
npm run seed:suppliers
```

脚本不会把管理员密码写入代码或配置文件。

## 页面读取策略

`/suppliers` 和 `/suppliers/[id]` 优先读取 Supabase 数据。数据库不可用时，
列表页自动回退到现有 Mock 数据，避免演示页面白屏。数据库字段覆盖主数据，
原有联网核验、尽调和页面展示信息作为兼容数据保留。
