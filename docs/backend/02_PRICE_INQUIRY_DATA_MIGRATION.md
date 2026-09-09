# 价格与询价数据迁移

## 已迁移数据

| 数据域 | 数量 | 说明 |
| --- | ---: | --- |
| 设备价格 | 10 | 写入 `wpi_equipment_prices` |
| 地材价格 | 10 | 写入 `wpi_material_prices` |
| 询价任务 | 8 | 写入 `wpi_inquiries` |
| 询价明细 | 11 | 写入 `wpi_inquiry_items` |
| 询价候选供应商 | 24 | 写入 `wpi_inquiry_suppliers` |

设备和地材价格迁移后统一进入 `pending_review`，原 Mock 审核状态保存在
`metadata` 中，未经人工复核的数据不会直接成为正式商务价格。

## 供应商匹配原则

仅在名称可可靠匹配时写入 `supplier_id`。无法可靠匹配的原始供应商名称保留在
`metadata` 中，避免将价格错误关联到当前供应商库。询价候选供应商均以
`draft` 状态写入，并标记为需要人工确认。

## 重复执行

迁移脚本按组织和业务编号执行幂等更新：

```powershell
$env:SUPABASE_SEED_EMAIL="<admin-email>"
$env:SUPABASE_SEED_PASSWORD="<admin-password>"
npm run seed:business
```

不要把账号密码写入仓库。脚本从 `.env.local` 读取 Supabase URL 和公开密钥，
并通过管理员登录后的 RLS 权限执行迁移。

## 页面接入

- `/equipment-prices` 与详情页：Supabase 优先，读取失败时保留 Mock 回退。
- `/material-prices` 与详情页：Supabase 优先，读取失败时保留 Mock 回退。
- `/inquiries` 与详情页：Supabase 优先，读取失败时保留 Mock 回退。
- `/inquiries/create`：创建真实草稿询价、明细和候选供应商记录，不发送真实邮件。

## 人工审核边界

1. 价格记录必须人工复核后才能进入正式使用状态。
2. 未匹配供应商不得自动补写外键。
3. 询价候选供应商必须人工确认后才能发送。
4. 当前流程不调用真实 AI、邮件、上传或导出服务。
