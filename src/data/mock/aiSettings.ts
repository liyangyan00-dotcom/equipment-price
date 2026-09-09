export const aiModelConfigs = [
  { name: "报价识别模型", mode: "稳健模式", threshold: "88%", description: "用于PDF、邮件与图片报价字段抽取" },
  { name: "BOQ解析模型", mode: "高召回模式", threshold: "82%", description: "用于项目清单拆分、分类与价格匹配" },
  { name: "比价建议模型", mode: "风险优先", threshold: "86%", description: "用于供应商报价差异和采用建议" },
  { name: "报告生成模型", mode: "可解释模式", threshold: "90%", description: "用于生成结论、风险说明和证据引用" },
];

export const confidenceThresholds = [
  { label: "自动入库阈值", value: "92%", description: "高于该值可建议直接入库" },
  { label: "人工复核阈值", value: "80%", description: "低于该值必须进入待复核池" },
  { label: "风险预警阈值", value: "15%", description: "价格偏离市场均价超过该比例触发风险" },
  { label: "BOQ匹配阈值", value: "86%", description: "低于该值列为无匹配或相似匹配" },
];

export const aiRiskRules = [
  { title: "低价异常", condition: "低于同类市场均价 20% 以上", action: "标记高风险并要求人工说明" },
  { title: "参数缺失", condition: "规格型号、有效期、来源任一缺失", action: "进入人工复核并生成补全建议" },
  { title: "供应商风险", condition: "供应商评分低于 70 或历史履约异常", action: "建议更换供应商或补充证据" },
  { title: "证据链不足", condition: "报价无原始文件或无联系人来源", action: "限制进入正式价格库" },
];

export const manualReviewRules = [
  "AI置信度低于 80% 的报价结果必须人工复核",
  "高风险价格不得直接进入项目套价",
  "供应商资质缺失时不得生成推荐采用结论",
  "报告生成前必须完成缺失证据确认",
];

export const promptTemplates = [
  { name: "报价识别提示词", version: "v2.6", scope: "报价字段抽取与缺失字段判断" },
  { name: "风险判断提示词", version: "v1.9", scope: "价格异常、供应商风险、证据缺口" },
  { name: "询价函生成提示词", version: "v2.1", scope: "中英法多语言询价函" },
  { name: "报告结论提示词", version: "v1.7", scope: "AI结论、风险说明、商务建议" },
];

export const aiTaskTypes = [
  { name: "报价识别", enabled: true, owner: "AI复核员" },
  { name: "AI价格采集", enabled: true, owner: "价格管理员" },
  { name: "AI比价分析", enabled: true, owner: "商务预算组" },
  { name: "BOQ解析", enabled: true, owner: "项目套价组" },
  { name: "报告生成", enabled: false, owner: "报告管理员" },
];

export const aiAuditLogs = [
  { time: "2026-06-15 10:30", actor: "张工", action: "调整报价识别模型阈值为 88%" },
  { time: "2026-06-14 17:12", actor: "AI管理员", action: "启用低价异常高风险规则" },
  { time: "2026-06-13 09:40", actor: "李工", action: "更新询价函生成提示词 v2.1" },
];
