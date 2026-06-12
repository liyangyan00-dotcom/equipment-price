# 28 交给 Codex 前的 API 检查清单

## 一、当前不做真实 API

当前阶段不实现：

- Route Handler；
- 数据库；
- Supabase；
- AI接口；
- 文件上传服务。

## 二、正式进入后端前应确认

| 检查项 | 说明 |
|---|---|
| 字段字典是否稳定 | API 字段必须与字段字典一致 |
| mock 数据是否稳定 | 前端 mock 应先跑通 |
| 页面是否还原完成 | 先完成 UI 再接 API |
| 审核流程是否明确 | AI 结果不能直接入库 |
| 附件关系是否明确 | 价格必须能关联附件 |
| 权限角色是否明确 | 多人使用前再做权限 |
| 导出格式是否明确 | Excel/PDF/Word 需后续单独设计 |

## 三、API 实现推荐顺序

1. Auth/User；
2. EquipmentPrice；
3. MaterialPrice；
4. Supplier；
5. Attachment；
6. PendingQuote；
7. AI Task；
8. Inquiry/Comparison；
9. ProjectPricing；
10. Report；
11. Analytics/Settings。
