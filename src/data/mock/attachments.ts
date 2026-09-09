import type { ConfidenceLevel, RiskLevel, ReviewStatus } from "@/types/common";

export type EvidenceStatus = "linked" | "pending" | "unlinked";

export type AttachmentLibraryRow = {
  id: string;
  name: string;
  size: string;
  type: string;
  object: string;
  priceId: string;
  supplier: string;
  source: string;
  uploader: string;
  uploadedAt: string;
  status: EvidenceStatus;
  fileKind: "pdf" | "mail" | "sheet" | "image";
};

export const attachmentLibraryRows: AttachmentLibraryRow[] = [
  {
    id: "ATT-20260619-001",
    name: "DN800 PN16电动蝶阀正式报价单.pdf",
    size: "1.24 MB",
    type: "报价单 (PDF)",
    object: "DN800 PN16 电动蝶阀",
    priceId: "EQP-2026-0001",
    supplier: "Grundfos 丹麦",
    source: "供应商正式报价(含技术参数)",
    uploader: "张工",
    uploadedAt: "2025-06-19 09:42",
    status: "linked",
    fileKind: "pdf",
  },
  {
    id: "ATT-20260618-002",
    name: "关于DN500离心泵报价确认邮件.eml",
    size: "856 KB",
    type: "邮件记录 (EML)",
    object: "DN500 离心泵",
    priceId: "EQP-2026-0007",
    supplier: "KSB 德国",
    source: "供应商邮件报价及交期说明",
    uploader: "李工",
    uploadedAt: "2025-06-18 16:21",
    status: "linked",
    fileKind: "mail",
  },
  {
    id: "ATT-20260618-003",
    name: "2025年6月不锈钢管材市场调研.xlsx",
    size: "312 KB",
    type: "市场调研 (XLSX)",
    object: "不锈钢管材 DN100",
    priceId: "MAT-2026-0003",
    supplier: "-",
    source: "第三方市场价格调研数据",
    uploader: "王工",
    uploadedAt: "2025-06-18 10:08",
    status: "linked",
    fileKind: "sheet",
  },
  {
    id: "ATT-20260617-004",
    name: "UPVC管材价格表2025-06.pdf",
    size: "623 KB",
    type: "报价表 (PDF)",
    object: "UPVC管材 DN110",
    priceId: "MAT-2026-0011",
    supplier: "联塑LESSO 中国",
    source: "供应商公开报价单据",
    uploader: "赵工",
    uploadedAt: "2025-06-17 14:33",
    status: "pending",
    fileKind: "pdf",
  },
  {
    id: "ATT-20260617-005",
    name: "变频控制柜照片现场拍摄.jpg",
    size: "1.08 MB",
    type: "图片 (JPG)",
    object: "变频控制柜",
    priceId: "EQP-2026-0023",
    supplier: "Schneider 施耐德",
    source: "项目现场拍照设备铭牌",
    uploader: "陈工",
    uploadedAt: "2025-06-17 09:15",
    status: "pending",
    fileKind: "image",
  },
  {
    id: "ATT-20260616-006",
    name: "不锈钢法兰报价单(含税).pdf",
    size: "754 KB",
    type: "报价单 (PDF)",
    object: "不锈钢法兰 DN150",
    priceId: "MAT-2026-0018",
    supplier: "温州强泰 中国",
    source: "供应商含税正式报价单",
    uploader: "刘工",
    uploadedAt: "2025-06-16 11:27",
    status: "unlinked",
    fileKind: "pdf",
  },
  {
    id: "ATT-20260615-007",
    name: "付款条款沟通邮件.eml",
    size: "612 KB",
    type: "邮件记录 (EML)",
    object: "多项设备",
    priceId: "-",
    supplier: "多家供应商",
    source: "付款条款与商务谈判记录",
    uploader: "张工",
    uploadedAt: "2025-06-15 17:02",
    status: "unlinked",
    fileKind: "mail",
  },
];

export type AttachmentEvidence = {
  id: string;
  fileName: string;
  fileType: string;
  relatedObject: string;
  business: string;
  source: string;
  aiType: string;
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  status: ReviewStatus;
  uploadedAt: string;
  size: string;
};

export const attachmentKpis = [
  { label: "附件总数", value: "1,286", unit: "份", trend: "+18.4%", description: "报价、邮件、图片与BOQ" },
  { label: "今日新增", value: "42", unit: "份", trend: "+12", description: "新归档证据" },
  { label: "已归档", value: "986", unit: "份", trend: "76.7%", description: "已建立业务关联" },
  { label: "待关联", value: "138", unit: "份", trend: "需处理", description: "缺少对象或来源" },
  { label: "缺失证据", value: "56", unit: "项", trend: "AI提醒", description: "报价链路不完整" },
  { label: "高风险证据", value: "18", unit: "项", trend: "+6", description: "需人工复核" },
];

export const attachmentRows: AttachmentEvidence[] = [
  {
    id: "ATT-202506-001",
    fileName: "DN300蝶阀报价单.pdf",
    fileType: "PDF报价单",
    relatedObject: "电动蝶阀 DN300 PN16",
    business: "设备价格库",
    source: "供应商邮件",
    aiType: "报价证据",
    confidence: "A",
    risk: "low",
    status: "confirmed",
    uploadedAt: "2026-06-15 09:20",
    size: "1.8 MB",
  },
  {
    id: "ATT-202506-002",
    fileName: "HRB400钢筋询价回复.xlsx",
    fileType: "Excel",
    relatedObject: "HRB400 钢筋 Φ16mm",
    business: "地材价格库",
    source: "WhatsApp",
    aiType: "询价回复",
    confidence: "B",
    risk: "medium",
    status: "pending",
    uploadedAt: "2026-06-15 10:08",
    size: "0.9 MB",
  },
  {
    id: "ATT-202506-003",
    fileName: "Kinshasa泵站供应商资质.zip",
    fileType: "压缩包",
    relatedObject: "Kinshasa Water Solutions",
    business: "供应商库",
    source: "人工导入",
    aiType: "资质证据",
    confidence: "C",
    risk: "medium",
    status: "need_info",
    uploadedAt: "2026-06-14 16:40",
    size: "8.6 MB",
  },
  {
    id: "ATT-202506-004",
    fileName: "项目BOQ_提标改造.xlsx",
    fileType: "BOQ清单",
    relatedObject: "金沙滩水厂扩建项目",
    business: "项目套价",
    source: "项目上传",
    aiType: "BOQ依据",
    confidence: "A",
    risk: "low",
    status: "confirmed",
    uploadedAt: "2026-06-14 13:15",
    size: "2.4 MB",
  },
  {
    id: "ATT-202506-005",
    fileName: "低价异常说明截图.png",
    fileType: "图片",
    relatedObject: "PLC控制柜 MNS 4000A",
    business: "AI风险复核",
    source: "网页采集",
    aiType: "风险证据",
    confidence: "D",
    risk: "high",
    status: "pending",
    uploadedAt: "2026-06-13 18:25",
    size: "620 KB",
  },
  {
    id: "ATT-202506-006",
    fileName: "比价汇总表_Q2.xlsx",
    fileType: "比价表",
    relatedObject: "PAC加药系统询价",
    business: "询价与比价",
    source: "系统生成",
    aiType: "比价依据",
    confidence: "B",
    risk: "low",
    status: "confirmed",
    uploadedAt: "2026-06-13 11:12",
    size: "1.2 MB",
  },
];

export type AttachmentDetailRecord = AttachmentLibraryRow & {
  mimeType: string;
  checksum: string;
  storageBucket: string;
  objectPath: string;
  documentDate: string;
  validUntil: string;
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  reviewStatus: ReviewStatus;
  aiSummary: string;
  recommendedAction: string;
  archiveTags: string[];
  extractedFields: Array<{ label: string; value: string; confidence: number }>;
  issues: Array<{ label: string; severity: RiskLevel; status: "open" | "resolved" }>;
  relations: Array<{ label: string; value: string; href?: string }>;
  auditTrail: Array<{ time: string; actor: string; action: string; detail: string }>;
};

function inferMimeType(kind: AttachmentLibraryRow["fileKind"]) {
  return {
    pdf: "application/pdf",
    mail: "message/rfc822",
    sheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    image: "image/jpeg",
  }[kind];
}

function createAttachmentDetail(row: AttachmentLibraryRow, index: number): AttachmentDetailRecord {
  const confidence: ConfidenceLevel = row.status === "linked" ? "A" : row.status === "pending" ? "B" : "D";
  const risk: RiskLevel = row.status === "linked" ? "low" : row.status === "pending" ? "medium" : "high";
  const reviewStatus: ReviewStatus = row.status === "linked" ? "confirmed" : row.status === "pending" ? "pending" : "need_info";
  const objectHref = row.priceId === "-"
    ? undefined
    : row.priceId.startsWith("MAT-")
      ? `/material-prices/${row.priceId}`
      : `/equipment-prices/${row.priceId}`;

  return {
    ...row,
    mimeType: inferMimeType(row.fileKind),
    checksum: `SHA256-${row.id.replaceAll("-", "").slice(-10)}${String(index + 17).padStart(4, "0")}`,
    storageBucket: "wpi-evidence-private",
    objectPath: `business-evidence/${row.uploadedAt.slice(0, 7)}/${row.id}/${row.name}`,
    documentDate: row.uploadedAt.slice(0, 10),
    validUntil: row.fileKind === "image" || row.fileKind === "mail" ? "不适用" : "2026-09-30",
    confidence,
    risk,
    reviewStatus,
    aiSummary: row.status === "linked"
      ? `AI 已识别该文件为${row.type}，文件主体、关联对象和来源字段一致，可作为 ${row.object} 的业务证据。`
      : `AI 已完成文件类型与主体识别，但${row.status === "pending" ? "有效期或关联关系仍需人工确认" : "尚未找到唯一业务对象"}，不得直接用于正式价格或报告。`,
    recommendedAction: row.status === "linked" ? "保持归档并用于价格复核" : row.status === "pending" ? "核对有效期后确认关联" : "选择业务对象并提交人工审核",
    archiveTags: [row.fileKind.toUpperCase(), row.type.split(" ")[0], row.object, row.supplier === "-" ? "无供应商" : row.supplier, row.status === "linked" ? "已审核" : "待人工确认"],
    extractedFields: [
      { label: "证据对象", value: row.object, confidence: row.status === "linked" ? 96 : 82 },
      { label: "供应商", value: row.supplier, confidence: row.supplier === "-" ? 45 : 91 },
      { label: "来源类型", value: row.source, confidence: row.status === "unlinked" ? 72 : 94 },
      { label: "关联价格编号", value: row.priceId, confidence: row.priceId === "-" ? 32 : 97 },
      { label: "文件日期", value: row.uploadedAt.slice(0, 10), confidence: 99 },
    ],
    issues: row.status === "linked"
      ? [{ label: "文件哈希与归档记录一致", severity: "low", status: "resolved" }]
      : [
          { label: row.priceId === "-" ? "缺少唯一关联价格编号" : "关联关系待人工确认", severity: row.status === "unlinked" ? "high" : "medium", status: "open" },
          { label: row.fileKind === "pdf" ? "报价有效期需要复核" : "原始来源需要交叉核验", severity: "medium", status: "open" },
        ],
    relations: [
      { label: "关联业务对象", value: row.object, href: objectHref },
      { label: "关联价格编号", value: row.priceId, href: objectHref },
      { label: "关联供应商", value: row.supplier, href: row.supplier === "-" ? undefined : `/suppliers?keyword=${encodeURIComponent(row.supplier)}` },
      { label: "报告引用", value: index % 2 === 0 ? "RPT-202506-001" : "暂未被报告引用", href: index % 2 === 0 ? "/reports/RPT-202506-001" : undefined },
    ],
    auditTrail: [
      { time: row.uploadedAt, actor: row.uploader, action: "上传文件", detail: `上传 ${row.name}` },
      { time: row.uploadedAt, actor: "AI归档助手", action: "识别与抽取", detail: `识别为${row.type}，生成字段与可信度` },
      { time: row.status === "linked" ? "2025-06-20 10:12" : "待处理", actor: row.status === "linked" ? "审核员" : "系统", action: row.status === "linked" ? "确认关联" : "等待人工确认", detail: row.status === "linked" ? `已关联至 ${row.object}` : recommendedActionFor(row.status) },
    ],
  };
}

function recommendedActionFor(status: EvidenceStatus) {
  return status === "pending" ? "请复核业务对象、有效期与来源" : "请补充关联对象和原始来源";
}

const legacyAttachmentRows: AttachmentLibraryRow[] = attachmentRows.map((row) => ({
  id: row.id,
  name: row.fileName,
  size: row.size,
  type: row.fileType,
  object: row.relatedObject,
  priceId: row.relatedObject.startsWith("HRB") ? "MAT-2026-0003" : row.business === "设备价格库" ? "EQP-2026-0001" : "-",
  supplier: row.business === "供应商库" ? row.relatedObject : "待核验供应商",
  source: row.source,
  uploader: "系统归档",
  uploadedAt: row.uploadedAt,
  status: row.status === "confirmed" ? "linked" : row.status === "pending" ? "pending" : "unlinked",
  fileKind: row.fileType.toLowerCase().includes("excel") || row.fileType.includes("BOQ") || row.fileType.includes("比价")
    ? "sheet"
    : row.fileType.includes("图片")
      ? "image"
      : row.fileType.includes("邮件")
        ? "mail"
        : "pdf",
}));

export const attachmentDetailRecords: AttachmentDetailRecord[] = [
  ...attachmentLibraryRows,
  ...legacyAttachmentRows.filter((legacy) => !attachmentLibraryRows.some((row) => row.id === legacy.id)),
].map(createAttachmentDetail);

export function resolveAttachmentDetail(id: string) {
  const exact = attachmentDetailRecords.find((item) => item.id.toLowerCase() === id.toLowerCase());
  if (exact) return exact;
  if (!id.toUpperCase().startsWith("ATT-")) return null;

  return createAttachmentDetail(
    {
      ...attachmentLibraryRows[0],
      id,
      name: `项目关联证据_${id}.pdf`,
      object: "待解析的项目关联对象",
      priceId: "-",
      supplier: "待核验供应商",
      source: "跨页面业务关联",
      uploader: "系统归档",
      status: "pending",
    },
    attachmentDetailRecords.length,
  );
}

export const aiArchiveSuggestions = [
  { title: "AI分类置信度良好", description: "986 份附件已完成类型识别，报价证据与资质证据匹配度最高。", tone: "green" },
  { title: "56 项证据链缺口", description: "设备报价缺少有效期或付款条款，建议补充供应商邮件原件。", tone: "orange" },
  { title: "18 项高风险证据", description: "低价异常、截图来源不明或重复附件需进入人工复核。", tone: "red" },
];

export const evidenceRelations = [
  { label: "价格库关联", value: 486, percent: "37.8%" },
  { label: "询价任务关联", value: 276, percent: "21.5%" },
  { label: "供应商档案", value: 198, percent: "15.4%" },
  { label: "项目套价依据", value: 168, percent: "13.1%" },
  { label: "报告引用", value: 158, percent: "12.2%" },
];

export const missingEvidenceItems = [
  { title: "报价有效期缺失", count: 22, action: "补充报价单" },
  { title: "供应商资质过期", count: 14, action: "重新归档" },
  { title: "价格来源不清", count: 12, action: "人工确认" },
  { title: "付款条款缺失", count: 8, action: "补全条款" },
];

export const evidenceTypeDistribution = [
  { name: "PDF报价单", value: 426, color: "#2F6BFF" },
  { name: "邮件记录", value: 318, color: "#40BFCB" },
  { name: "BOQ清单", value: 198, color: "#7754F6" },
  { name: "资质文件", value: 176, color: "#22A06B" },
  { name: "图片证据", value: 168, color: "#F59E0B" },
];

export const recentArchiveLogs = [
  "DN300蝶阀报价单已关联至设备价格库",
  "HRB400钢筋询价回复进入待补充流程",
  "比价汇总表_Q2已被报告引用",
  "低价异常说明截图进入人工复核",
];
