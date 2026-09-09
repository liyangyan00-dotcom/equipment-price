import type { ConfidenceLevel, RiskLevel, ReviewStatus } from "@/types/common";

export type GeneratedReport = {
  id: string;
  title: string;
  type: string;
  project: string;
  status: ReviewStatus;
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  updatedAt: string;
};

export const reportDetail: GeneratedReport = {
  id: "RPT-202506-001",
  title: "江北水厂提标改造项目成本分析报告",
  type: "项目成本分析报告",
  project: "江北水厂提标改造项目（一期）",
  status: "confirmed",
  confidence: "A",
  risk: "medium",
  updatedAt: "2026-06-15 11:30",
};

export const reportOutline = [
  "一、价格数据概览",
  "二、设备价格分析",
  "三、地材价格分析",
  "四、供应商报价对比",
  "五、项目套价结果",
  "六、风险与异常说明",
  "七、AI建议结论",
  "八、附件证据清单",
];

export const reportSections = [
  {
    title: "一、价格数据概览",
    body: "本报告基于设备价格库、地材价格库、供应商报价、询价比价结果与项目BOQ解析结果生成。当前引用价格数据 1,286 条，平均可信度 89.6%，其中高风险记录 12 条需要人工复核。",
  },
  {
    title: "二、设备价格分析",
    body: "设备类价格较上月上涨 4.32%，泵类、阀门类与电气控制设备波动最明显。AI识别到 DN300 蝶阀与PLC控制柜存在报价离散，建议优先锁定 A/B 级供应商报价。",
  },
  {
    title: "三、地材价格分析",
    body: "钢材、水泥与砂石价格整体平稳，但 Kinshasa 与 Matadi 区域存在运输成本差异。HRB400 钢筋近 30 天价格波动收窄，可作为项目预算暂估依据。",
  },
  {
    title: "四、供应商报价对比",
    body: "已纳入 18 家供应商报价记录，其中 6 家响应速度快、技术能力评分高。低价异常报价 3 条已被标记，建议商务部门在合同前补充付款与质保条件。",
  },
];

export const reportCitations = [
  { title: "DN300蝶阀报价单.pdf", source: "设备价格库", confidence: "A" },
  { title: "HRB400钢筋询价回复.xlsx", source: "地材价格库", confidence: "B" },
  { title: "比价汇总表_Q2.xlsx", source: "询价与比价", confidence: "A" },
  { title: "项目BOQ_提标改造.xlsx", source: "项目套价", confidence: "A" },
];

export const reportQualityChecks = [
  { label: "引用证据完整度", value: "92%", tone: "green" },
  { label: "价格口径一致性", value: "88%", tone: "blue" },
  { label: "缺失数据", value: "6 项", tone: "orange" },
  { label: "风险提示", value: "3 项", tone: "red" },
];

export const reportVersions = [
  { version: "v1.4", time: "2026-06-15 11:30", status: "当前版本", author: "AI报告中心" },
  { version: "v1.3", time: "2026-06-15 10:40", status: "补充证据", author: "张工" },
  { version: "v1.2", time: "2026-06-14 17:15", status: "风险复核", author: "AI报告中心" },
  { version: "v1.1", time: "2026-06-14 15:02", status: "初稿", author: "AI报告中心" },
];

export const exportOptions = [
  { label: "导出 Word", description: "含目录、图表和证据引用" },
  { label: "导出 PDF", description: "用于评审会归档" },
  { label: "导出证据包", description: "打包附件与引用明细" },
];

export type ReportLibraryRecord = GeneratedReport & {
  version: string;
  owner: string;
  sourceCount: number;
  evidenceCount: number;
  summary: string;
  recommendedAction: string;
  versions: Array<{
    version: string;
    time: string;
    author: string;
    note: string;
  }>;
};

export const reportLibraryRecords: ReportLibraryRecord[] = [
  {
    ...reportDetail,
    version: "v1.4",
    owner: "张工",
    sourceCount: 6,
    evidenceCount: 18,
    summary: "设备与地材价格口径已统一，高风险报价 3 条仍需商务复核。",
    recommendedAction: "复核异常报价后发布正式版本",
    versions: [
      { version: "v1.4", time: "2026-06-15 11:30", author: "张工", note: "补充风险说明与证据引用" },
      { version: "v1.3", time: "2026-06-15 10:40", author: "AI报告中心", note: "重新生成价格趋势章节" },
      { version: "v1.2", time: "2026-06-14 17:15", author: "李经理", note: "完成人工复核" },
    ],
  },
  {
    id: "REP-2025-0008",
    title: "卡南加水厂设备采购价格情报报告",
    type: "设备价格分析报告",
    project: "卡南加水厂项目",
    status: "confirmed",
    confidence: "A",
    risk: "low",
    updatedAt: "2026-06-14 16:20",
    version: "v2.1",
    owner: "王工",
    sourceCount: 8,
    evidenceCount: 26,
    summary: "核心设备价格证据完整，泵阀供应商报价可进入采购评审。",
    recommendedAction: "归档当前版本并用于评审会",
    versions: [
      { version: "v2.1", time: "2026-06-14 16:20", author: "王工", note: "更新供应商建议" },
      { version: "v2.0", time: "2026-06-13 09:45", author: "AI报告中心", note: "补充设备价格趋势" },
    ],
  },
  {
    id: "RPT-202506-002",
    title: "华东区水泵供应商比价分析报告",
    type: "供应商比价报告",
    project: "华东区设备集中采购",
    status: "confirmed",
    confidence: "A",
    risk: "low",
    updatedAt: "2026-06-13 14:10",
    version: "v1.3",
    owner: "赵经理",
    sourceCount: 5,
    evidenceCount: 15,
    summary: "3 家核心供应商报价差异可解释，推荐方案兼顾价格与交付。",
    recommendedAction: "进入采购决策审批",
    versions: [
      { version: "v1.3", time: "2026-06-13 14:10", author: "赵经理", note: "确认推荐方案" },
      { version: "v1.2", time: "2026-06-13 11:05", author: "AI报告中心", note: "生成比价建议" },
    ],
  },
  {
    id: "RPT-202506-003",
    title: "刚果（金）项目 BOQ 套价测算报告",
    type: "项目套价报告",
    project: "Kinshasa 水厂扩建项目",
    status: "need_info",
    confidence: "C",
    risk: "high",
    updatedAt: "2026-06-13 09:35",
    version: "v0.8",
    owner: "周工",
    sourceCount: 4,
    evidenceCount: 9,
    summary: "仍有 12 项 BOQ 缺少可用价格，运输与税费口径尚未确认。",
    recommendedAction: "补齐价格缺口后重新生成",
    versions: [
      { version: "v0.8", time: "2026-06-13 09:35", author: "AI报告中心", note: "标记价格缺口" },
      { version: "v0.7", time: "2026-06-12 18:20", author: "周工", note: "修正 BOQ 分类" },
    ],
  },
  {
    id: "RPT-202506-004",
    title: "近 30 天异常价格风险专题报告",
    type: "风险专题报告",
    project: "全局价格风险监测",
    status: "pending",
    confidence: "B",
    risk: "high",
    updatedAt: "2026-06-12 17:50",
    version: "v1.0",
    owner: "AI报告中心",
    sourceCount: 7,
    evidenceCount: 21,
    summary: "识别到低价异常、有效期过期和参数缺失三类集中风险。",
    recommendedAction: "分派人工复核任务",
    versions: [
      { version: "v1.0", time: "2026-06-12 17:50", author: "AI报告中心", note: "生成待审核版本" },
    ],
  },
  {
    id: "RPT-202506-005",
    title: "二季度地材价格趋势分析报告",
    type: "地材价格分析报告",
    project: "区域地材价格监测",
    status: "confirmed",
    confidence: "A",
    risk: "medium",
    updatedAt: "2026-06-11 15:25",
    version: "v1.2",
    owner: "陈工",
    sourceCount: 9,
    evidenceCount: 32,
    summary: "钢材价格回落，水泥与砂石受区域运输成本影响仍有分化。",
    recommendedAction: "更新项目预算基准价",
    versions: [
      { version: "v1.2", time: "2026-06-11 15:25", author: "陈工", note: "确认区域差异" },
      { version: "v1.1", time: "2026-06-11 11:00", author: "AI报告中心", note: "生成趋势分析" },
    ],
  },
  {
    id: "RPT-202506-006",
    title: "高风险供应商交付能力评估报告",
    type: "供应商风险报告",
    project: "供应商季度评估",
    status: "pending",
    confidence: "B",
    risk: "critical",
    updatedAt: "2026-06-10 13:45",
    version: "v0.9",
    owner: "采购组",
    sourceCount: 5,
    evidenceCount: 13,
    summary: "2 家供应商存在交付周期与资质证据冲突，需要人工确认。",
    recommendedAction: "核验资质与历史交付记录",
    versions: [
      { version: "v0.9", time: "2026-06-10 13:45", author: "采购组", note: "补充尽调冲突" },
    ],
  },
  {
    id: "RPT-202506-007",
    title: "污水处理项目机电设备采购建议",
    type: "采购建议报告",
    project: "南部污水处理厂项目",
    status: "confirmed",
    confidence: "A",
    risk: "low",
    updatedAt: "2026-06-09 10:18",
    version: "v1.5",
    owner: "商务预算组",
    sourceCount: 8,
    evidenceCount: 24,
    summary: "推荐设备与供应商均有 A/B 级证据，可进入询价与合同谈判。",
    recommendedAction: "创建采购评审任务",
    versions: [
      { version: "v1.5", time: "2026-06-09 10:18", author: "商务预算组", note: "批准采购建议" },
      { version: "v1.4", time: "2026-06-08 16:40", author: "AI报告中心", note: "更新供应商匹配" },
    ],
  },
  {
    id: "RPT-202506-008",
    title: "阀门设备价格缺口与询价建议报告",
    type: "价格缺口报告",
    project: "设备价格库治理",
    status: "need_info",
    confidence: "C",
    risk: "medium",
    updatedAt: "2026-06-08 09:30",
    version: "v0.6",
    owner: "刘工",
    sourceCount: 3,
    evidenceCount: 7,
    summary: "DN500 以上阀门近 90 天有效报价不足，可信度无法支撑套价。",
    recommendedAction: "创建定向询价任务",
    versions: [
      { version: "v0.6", time: "2026-06-08 09:30", author: "刘工", note: "确认缺口范围" },
    ],
  },
  {
    id: "RPT-202506-009",
    title: "五月设备价格库运营月报",
    type: "运营月报",
    project: "价格库运营",
    status: "confirmed",
    confidence: "A",
    risk: "low",
    updatedAt: "2026-06-05 17:00",
    version: "v1.0",
    owner: "系统管理员",
    sourceCount: 10,
    evidenceCount: 38,
    summary: "价格确认率和资料完整度持续提升，人工复核积压下降 18%。",
    recommendedAction: "归档并同步经营分析会",
    versions: [
      { version: "v1.0", time: "2026-06-05 17:00", author: "系统管理员", note: "正式归档" },
    ],
  },
];
