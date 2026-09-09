export const generalSettings = {
  systemName: "水务智采 · AI 价格情报与成本决策平台",
  organization: "商务预算组",
  dataScope: "设备价格、地材价格、供应商、询价比价、项目套价",
  defaultLanguage: "中文",
};

export const currencySettings = [
  { code: "USD/CNY", value: "7.18", source: "人工维护", updatedAt: "2026-06-15" },
  { code: "USD/CDF", value: "2,850.00", source: "项目汇率", updatedAt: "2026-06-12" },
  { code: "EUR/USD", value: "1.08", source: "人工维护", updatedAt: "2026-06-10" },
];

export const regionSettings = ["Kinshasa", "Matadi", "Lubumbashi", "Goma", "Likasi", "项目所在地"];

export const categorySettings = [
  { group: "设备分类", values: ["水泵设备", "阀门设备", "电气设备", "自控仪表", "加药消毒"] },
  { group: "地材分类", values: ["钢材", "水泥", "砂石", "管材", "燃油"] },
  { group: "供应商分类", values: ["设备供应商", "地材供应商", "服务供应商", "本地供应商"] },
];

export const notificationRules = [
  { title: "高风险价格", description: "价格风险等级为高时通知商务预算组", enabled: true },
  { title: "AI待复核", description: "AI识别置信度低于阈值时进入人工复核", enabled: true },
  { title: "证据缺失", description: "报价缺少有效期、来源或付款条件时提醒", enabled: true },
  { title: "供应商响应超期", description: "询价截止前24小时提醒未响应供应商", enabled: false },
];

export const permissionEntries = [
  { role: "商务预算组", scope: "价格维护、询价、比价、报告生成" },
  { role: "项目经理", scope: "查看项目套价、查看报告、发起询价" },
  { role: "AI复核员", scope: "AI结果复核、风险处理、证据归档" },
];
