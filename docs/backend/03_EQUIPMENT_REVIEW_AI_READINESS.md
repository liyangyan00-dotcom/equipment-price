# 设备价格 AI 预审接入准备（P1）

## 当前边界

- 当前默认 Provider 为 `deterministic`，只执行可重复的本地规则分析，不调用真实 AI API。
- AI 输出必须通过 `1.0` 结构校验，包含置信度、风险等级、证据发现、原因码和建议动作。
- 每次运行都会写入 `wpi_equipment_ai_review_runs`，保留 Provider、模型、提示词版本、输入快照、输出、失败原因和操作者。
- AI 结果始终设置 `requires_human_review = true`，不得直接通过、驳回或覆盖人工审核结论。
- 只有具有 `price.review` 权限的角色可以运行；审核员不能运行已由其他审核员认领的任务。

## 服务边界

```text
审核工作区
  -> POST /api/equipment-prices/reviews/[id]/ai
  -> Provider Registry
  -> EquipmentReviewAiProvider
  -> 结构化输出校验
  -> Supabase 运行记录与审计
  -> 人工审核员确认
```

Provider 接口位于：

```text
src/lib/ai/providers/equipmentReviewProvider.ts
```

默认规则 Provider 位于：

```text
src/lib/ai/providers/deterministicEquipmentReviewProvider.ts
```

## 接入真实模型前必须完成

1. 新增服务端 Provider Adapter，禁止在浏览器端暴露模型密钥。
2. 使用服务端密钥管理或受控网关，并配置请求超时、重试、限流和成本上限。
3. 对提交给模型的数据做敏感字段最小化，默认不发送联系人、账号、未授权附件正文。
4. 保持 `validateEquipmentAiReviewOutput` 为最终入库前的强制校验。
5. 保持失败回退：失败运行只写错误信息，不修改原人工审核数据。
6. 生产环境应将运行完成写入收敛到可信服务身份，避免客户端直接构造模型输出。
7. 增加离线评测集，至少覆盖参数缺失、来源冲突、异常低价、有效期过期和低置信度五类场景。

## 环境变量

```text
WPI_AI_REVIEW_PROVIDER=deterministic
```

真实 Provider 的模型密钥不得写入仓库或公开环境变量。
