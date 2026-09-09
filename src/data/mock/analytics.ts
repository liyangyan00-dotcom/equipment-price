export const analyticsKpis = [
  { label: "价格数据总量", value: "12,568", unit: "条", trend: "+8.6%", description: "设备、地材与历史报价" },
  { label: "本月更新", value: "1,286", unit: "条", trend: "+24.1%", description: "近30天价格记录" },
  { label: "供应商数量", value: "2,346", unit: "家", trend: "+5.7%", description: "活跃供应商 1,826 家" },
  { label: "AI任务数量", value: "328", unit: "项", trend: "92.6%", description: "平均识别成功率" },
  { label: "高风险记录", value: "48", unit: "条", trend: "+6", description: "需人工复核" },
  { label: "价格缺口", value: "86", unit: "项", trend: "-8", description: "已生成补采建议" },
];

export const priceTrendSeries = [
  { label: "04-21", equipment: 82, material: 48, inquiry: 18 },
  { label: "04-27", equipment: 88, material: 54, inquiry: 20 },
  { label: "05-03", equipment: 94, material: 59, inquiry: 24 },
  { label: "05-09", equipment: 96, material: 62, inquiry: 28 },
  { label: "05-15", equipment: 108, material: 70, inquiry: 34 },
  { label: "05-20", equipment: 126, material: 78, inquiry: 42 },
];

export const supplierPerformance = [
  { name: "格兰富水泵", response: 92, quotes: 46 },
  { name: "Aqua Congo", response: 88, quotes: 35 },
  { name: "Kinshasa Logistics", response: 74, quotes: 17 },
  { name: "EastAfrica Steel", response: 81, quotes: 28 },
];

export const aiEfficiency = [
  { label: "报价识别", value: 92 },
  { label: "BOQ解析", value: 86 },
  { label: "比价建议", value: 78 },
  { label: "报告生成", value: 82 },
];

export const riskDistribution = [
  { name: "低风险", value: 642, color: "#22A06B" },
  { name: "中风险", value: 386, color: "#F59E0B" },
  { name: "高风险", value: 220, color: "#EF4444" },
];

export const confidenceDistribution = [
  { name: "A 高可信", value: 4447, color: "#2F6BFF" },
  { name: "B 较高", value: 5735, color: "#22A06B" },
  { name: "C 一般", value: 2386, color: "#F59E0B" },
];

export const priceGapAnalysis = [
  { label: "设备价格缺口", value: 34, percent: "39.5%" },
  { label: "地材区域缺口", value: 28, percent: "32.6%" },
  { label: "供应商缺口", value: 16, percent: "18.6%" },
  { label: "证据缺口", value: 8, percent: "9.3%" },
];

export const analyticsInsights = [
  "AI识别到阀门类设备近30天报价离散度扩大，建议增加A/B级供应商询价。",
  "地材价格受运输区域影响明显，Kinshasa 与 Matadi 的砂石价格需分区维护。",
  "供应商响应率较上月提升 6.1%，但仍有 12 家关键供应商未响应。",
  "高风险价格主要集中在过期报价、低价异常和参数缺失三类。",
];
