export type SupplierGovernanceRow = {
  id: string;
  supplierCode: string;
  supplierName: string;
  completeness: number;
  missingFields: string[];
  duplicateRisk: "high" | "medium" | "low";
  contactStatus: "complete" | "missing" | "invalid";
  whatsappStatus: "complete" | "missing" | "invalid";
  emailStatus: "complete" | "missing" | "invalid";
  scopeStatus: "complete" | "missing" | "pending";
  importBatch: string;
  reviewStatus: "pending" | "need_info" | "confirmed" | "rejected";
  aiSuggestion: string;
};

export const supplierGovernanceKpis = [
  { label: "待补全资料", value: "24", unit: "家", trend: "较昨日 -3", description: "证照、联系人或主营范围缺失", tone: "orange" as const },
  { label: "待审核供应商", value: "38", unit: "家", trend: "本周新增 12", description: "导入后等待人工确认", tone: "blue" as const },
  { label: "重复记录", value: "11", unit: "组", trend: "AI识别 8组", description: "名称、电话或邮箱疑似重复", tone: "red" as const },
  { label: "联系方式缺失", value: "19", unit: "家", trend: "WhatsApp 6 / 邮箱 8", description: "影响询价触达", tone: "orange" as const },
  { label: "AI已补全", value: "216", unit: "条", trend: "完成率 75.5%", description: "由AI建议并等待复核", tone: "purple" as const },
  { label: "异常供应商", value: "7", unit: "家", trend: "需人工治理", description: "无效、停用或资料冲突", tone: "red" as const },
];

export const supplierGovernanceRows: SupplierGovernanceRow[] = [
  {
    id: "GOV-SUP-001",
    supplierCode: "SUP-202506-001",
    supplierName: "上海凯泉泵业（集团）有限公司",
    completeness: 92,
    missingFields: ["出口资质"],
    duplicateRisk: "low",
    contactStatus: "complete",
    whatsappStatus: "complete",
    emailStatus: "complete",
    scopeStatus: "pending",
    importBatch: "IMP-202606-01",
    reviewStatus: "pending",
    aiSuggestion: "补充出口资质后可确认入库",
  },
  {
    id: "GOV-SUP-002",
    supplierCode: "SUP-202506-002",
    supplierName: "天津博华泵业有限公司",
    completeness: 78,
    missingFields: ["WhatsApp", "最近报价"],
    duplicateRisk: "medium",
    contactStatus: "complete",
    whatsappStatus: "missing",
    emailStatus: "complete",
    scopeStatus: "complete",
    importBatch: "IMP-202606-01",
    reviewStatus: "need_info",
    aiSuggestion: "疑似与旧档案同电话，建议合并复核",
  },
  {
    id: "GOV-SUP-003",
    supplierCode: "SUP-202506-003",
    supplierName: "Kinshasa Water Solutions SARL",
    completeness: 86,
    missingFields: ["税务登记"],
    duplicateRisk: "low",
    contactStatus: "complete",
    whatsappStatus: "complete",
    emailStatus: "missing",
    scopeStatus: "complete",
    importBatch: "IMP-202606-02",
    reviewStatus: "pending",
    aiSuggestion: "建议补充邮箱和本地税务登记文件",
  },
  {
    id: "GOV-SUP-004",
    supplierCode: "SUP-202506-004",
    supplierName: "Aqua Congo Services SARL",
    completeness: 61,
    missingFields: ["联系人", "邮箱", "主营范围"],
    duplicateRisk: "high",
    contactStatus: "missing",
    whatsappStatus: "complete",
    emailStatus: "missing",
    scopeStatus: "missing",
    importBatch: "IMP-202606-02",
    reviewStatus: "need_info",
    aiSuggestion: "资料缺失较多且名称相似，建议暂缓入库",
  },
  {
    id: "GOV-SUP-005",
    supplierCode: "SUP-202506-005",
    supplierName: "Grundfos South Africa (Pty)Ltd",
    completeness: 95,
    missingFields: [],
    duplicateRisk: "low",
    contactStatus: "complete",
    whatsappStatus: "complete",
    emailStatus: "complete",
    scopeStatus: "complete",
    importBatch: "IMP-202605-18",
    reviewStatus: "confirmed",
    aiSuggestion: "资料完整，可作为标准档案样本",
  },
  {
    id: "GOV-SUP-006",
    supplierCode: "SUP-202506-006",
    supplierName: "本地物流供应商",
    completeness: 48,
    missingFields: ["营业执照", "联系人", "邮箱", "主营范围"],
    duplicateRisk: "medium",
    contactStatus: "invalid",
    whatsappStatus: "missing",
    emailStatus: "invalid",
    scopeStatus: "missing",
    importBatch: "IMP-202606-03",
    reviewStatus: "rejected",
    aiSuggestion: "联系方式无效，建议退回重新采集",
  },
];

export const supplierCompletionSuggestions = [
  { label: "缺失联系人", value: 9, action: "AI从报价单提取联系人" },
  { label: "缺失 WhatsApp", value: 6, action: "从历史邮件签名补全" },
  { label: "缺失邮箱", value: 8, action: "匹配官网公开邮箱" },
  { label: "主营范围待分类", value: 13, action: "AI生成供应商标签" },
];

export const duplicateSupplierGroups = [
  { label: "天津博华泵业 / 博华泵业天津办", value: 2, action: "合并候选" },
  { label: "Aqua Congo Services / Aqua Congo SARL", value: 3, action: "人工确认" },
  { label: "本地物流供应商 / Kinshasa Logistics", value: 2, action: "暂不合并" },
];

export const missingDataItems = [
  { label: "证照文件缺失", value: 12, action: "批量催补" },
  { label: "联系人缺失", value: 9, action: "AI提取" },
  { label: "主营范围未分类", value: 13, action: "生成标签" },
];

export const importLogs = [
  { label: "IMP-202606-03", value: 36, action: "12条待治理" },
  { label: "IMP-202606-02", value: 58, action: "7条重复风险" },
  { label: "IMP-202606-01", value: 42, action: "已完成审核" },
];
