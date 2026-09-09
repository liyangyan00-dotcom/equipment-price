export type CollectionTaskStatus =
  | "running"
  | "queued"
  | "paused"
  | "completed"
  | "failed"
  | "needs_review"
  | "archived";

export type SourceHealthStatus = "healthy" | "warning" | "failed";

export type EquipmentDataSource = {
  id: string;
  name: string;
  type: string;
  supplierName: string;
  brand: string;
  url?: string;
  equipmentCategories: string[];
  healthStatus: SourceHealthStatus;
  lastCollectedAt: string;
  failureCount: number;
  confidenceLevel: "A" | "B" | "C" | "D" | "E";
  normalCount: number;
  abnormalCount: number;
};

export type CollectionMethod = {
  id: string;
  name: string;
  applicableSourceTypes: string[];
  parseTarget: "webpage" | "pdf" | "excel" | "manual" | "mixed";
  aiEnabled: boolean;
  dedupeEnabled: boolean;
  standardizationEnabled: boolean;
  retryEnabled: boolean;
  maxRetry: number;
  reviewRequired: boolean;
  scheduled: boolean;
  taskCount: number;
};

export type CollectionTaskLog = {
  id: string;
  time: string;
  level: "success" | "info" | "warning" | "error";
  message: string;
};

export type EquipmentCatalogCollectionTask = {
  id: string;
  taskCode: string;
  taskName: string;
  supplierName: string;
  brand: string;
  dataSourceId: string;
  dataSourceName: string;
  sourceType: string;
  sourceTypes?: string[];
  collectionMethodId: string;
  collectionMethodName: string;
  equipmentCategory: string;
  collectionScope: string;
  status: CollectionTaskStatus;
  progress: number;
  collectedPages: number;
  parsedEquipment: number;
  pendingReview: number;
  failedCount: number;
  sourceHealth: number;
  aiConfidence: number;
  riskLevel: "low" | "medium" | "high";
  currentStage: string;
  lastRunAt: string;
  nextRunAt: string;
  createdAt: string;
  frequency: string;
  logs: CollectionTaskLog[];
};

export type ExtractedEquipment = {
  id: string;
  taskId: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  confidence: number;
  reviewStatus: "pending" | "approved" | "needs_info";
};

export type PendingCatalogReview = {
  id: string;
  taskId: string;
  name: string;
  brand: string;
  missingParameters: string;
  riskLevel: "low" | "medium" | "high";
};

export type CollectionFailure = {
  id: string;
  taskId: string;
  sourceName: string;
  reason: string;
  failedAt: string;
  retryCount: number;
};

export type EquipmentCatalogCollectionDraft = {
  taskName: string;
  taskCode: string;
  manufacturerId: string;
  manufacturerName: string;
  brand: string;
  equipmentCategory: string;
  priority: "high" | "medium" | "low";
  owner: string;
  description: string;
  projectId?: string;
  tags: string[];
  expectedCompleteAt: string;
  notes: string;
  selectedDataSourceIds: string[];
  selectedCollectionMethodIds: string[];
  collectionScope: string;
  productSeries: string[];
  modelKeywords: string[];
  equipmentTypeKeywords: string[];
  collectProductPages: boolean;
  collectPdfDatasheets: boolean;
  collectImages: boolean;
  collectParameterTables: boolean;
  collectStandards: boolean;
  languages: string[];
  maxPages: number;
  maxPdfFiles: number;
  parameterFields: string[];
  dedupeRule: string;
  standardizationRules: string[];
  scheduled: boolean;
  frequency: "once" | "daily" | "weekly" | "monthly" | "manual";
  plannedStartAt: string;
  retryCount: number;
  retryIntervalMinutes: number;
  confidenceThreshold: number;
  autoGenerateCandidates: boolean;
  autoReviewRequired: boolean;
  aiParameterCompletion: boolean;
  duplicateDetection: boolean;
  riskDetection: boolean;
  generateCollectionReport: boolean;
  completionNotification: boolean;
  failureNotification: boolean;
};

export const equipmentManufacturers = [
  "Grundfos", "KSB", "AVK", "Endress+Hauser", "Siemens", "Schneider Electric", "ABB",
  "Xylem", "Wilo", "Tsurumi", "ProMinent", "VEGA", "KROHNE", "Hach",
].map((name, index) => ({ id: `MFR-${String(index + 1).padStart(3, "0")}`, name, brand: name }));

export const waterPlantEquipmentTaxonomy = [
  "水泵", "阀门", "仪表", "电气设备", "加药设备", "消毒设备", "过滤设备", "污泥处理设备", "实验室设备", "辅助设备",
];

export const equipmentParameterTemplates: Record<string, string[]> = {
  水泵: ["流量", "扬程", "功率", "口径", "转速", "材质", "电压", "防护等级", "安装方式"],
  阀门: ["口径", "压力等级", "阀体材质", "连接方式", "执行方式", "防护等级", "密封材质", "适用介质"],
  仪表: ["测量范围", "输出信号", "精度", "介质", "防护等级", "电源", "安装方式", "通信协议"],
  电气设备: ["额定电压", "额定电流", "防护等级", "短路容量", "控制方式", "通讯协议", "安装方式"],
  加药设备: ["处理能力", "投加范围", "泵头材质", "控制精度", "工作压力", "电机功率"],
  消毒设备: ["处理能力", "消毒方式", "有效剂量", "功率", "防护等级", "控制方式"],
  过滤设备: ["处理能力", "过滤精度", "滤料", "工作压力", "反洗方式", "设备材质"],
  污泥处理设备: ["处理能力", "含水率", "带宽", "功率", "材质", "控制方式"],
  实验室设备: ["检测范围", "精度", "分辨率", "电源", "接口", "认证标准"],
  辅助设备: ["规格", "能力", "材质", "功率", "安装方式", "执行标准"],
};

export const defaultEquipmentCatalogCollectionDraft: EquipmentCatalogCollectionDraft = {
  taskName: "Grundfos 水泵产品资料采集",
  taskCode: "COLL-202608-0001",
  manufacturerId: "MFR-001",
  manufacturerName: "Grundfos",
  brand: "Grundfos",
  equipmentCategory: "水泵",
  priority: "medium",
  owner: "Admin",
  description: "采集 Grundfos 官网主 CR、NB、NK、SP 系列水泵的型号、规格、性能参数、选型曲线、材质、尺寸等资料。",
  projectId: "",
  tags: ["水厂设备", "水泵", "欧洲品牌"],
  expectedCompleteAt: "2026-08-31",
  notes: "",
  selectedDataSourceIds: ["SRC-001", "SRC-013"],
  selectedCollectionMethodIds: ["MTH-001", "MTH-002"],
  collectionScope: "CR、NB、NK、SP 系列水泵",
  productSeries: ["CR", "NB", "NK", "SP"],
  modelKeywords: ["CR", "NB", "NK", "SP"],
  equipmentTypeKeywords: ["pump", "centrifugal pump", "submersible pump"],
  collectProductPages: true,
  collectPdfDatasheets: true,
  collectImages: false,
  collectParameterTables: true,
  collectStandards: true,
  languages: ["中文", "英文"],
  maxPages: 500,
  maxPdfFiles: 100,
  parameterFields: ["流量", "扬程", "功率", "口径", "转速", "材质", "电压", "防护等级", "安装方式"],
  dedupeRule: "品牌 + 型号 + 关键参数",
  standardizationRules: ["单位换算", "型号清洗", "参数归一", "中英文名称映射", "重复设备合并"],
  scheduled: false,
  frequency: "once",
  plannedStartAt: "2026-08-25T09:00",
  retryCount: 3,
  retryIntervalMinutes: 10,
  confidenceThreshold: 0.75,
  autoGenerateCandidates: true,
  autoReviewRequired: true,
  aiParameterCompletion: true,
  duplicateDetection: true,
  riskDetection: true,
  generateCollectionReport: true,
  completionNotification: true,
  failureNotification: true,
};

export const sourceTypeLabels: Record<string, string> = {
  manufacturer_site: "厂家官网",
  supplier_site: "供应商官网",
  product_catalog: "产品目录",
  pdf_datasheet: "PDF样本",
  excel_catalog: "Excel目录",
  manual_input: "人工导入",
  api: "API接口",
};

export const statusLabels: Record<CollectionTaskStatus, string> = {
  running: "运行中",
  queued: "排队中",
  paused: "已暂停",
  completed: "已完成",
  failed: "失败",
  needs_review: "待审核",
  archived: "已归档",
};

export const equipmentDataSources: EquipmentDataSource[] = [
  ["SRC-001", "Grundfos 产品中心", "manufacturer_site", "格兰富水泵（上海）有限公司", "Grundfos", "水泵设备", "healthy", 1, 92],
  ["SRC-002", "KSB 中国产品目录", "product_catalog", "凯士比泵阀技术服务（天津）有限公司", "KSB", "阀门设备", "healthy", 0, 90],
  ["SRC-003", "AVK 技术资料站", "pdf_datasheet", "埃维柯阀门（安徽）有限公司", "AVK", "阀门设备", "warning", 2, 84],
  ["SRC-004", "Endress+Hauser 仪表目录", "manufacturer_site", "恩德斯豪斯中国", "Endress+Hauser", "仪表设备", "healthy", 0, 94],
  ["SRC-005", "Siemens 工业商城", "product_catalog", "西门子中国", "Siemens", "电气设备", "healthy", 1, 91],
  ["SRC-006", "Schneider Electric 产品站", "manufacturer_site", "施耐德电气中国", "Schneider Electric", "电气设备", "warning", 2, 82],
  ["SRC-007", "Tsurumi 水泵样本", "pdf_datasheet", "鹤见制作所", "Tsurumi", "水泵设备", "failed", 5, 66],
  ["SRC-008", "ABB 低压产品目录", "product_catalog", "ABB 中国", "ABB", "电气设备", "healthy", 0, 89],
  ["SRC-009", "Wilo 产品中心官网", "supplier_site", "威乐中国", "Wilo", "水泵设备", "warning", 1, 80],
  ["SRC-010", "远东电缆 Excel 目录", "excel_catalog", "远东电缆有限公司", "远东电缆", "电气设备", "healthy", 0, 87],
  ["SRC-011", "项目组人工设备台账", "manual_input", "项目采购组", "多品牌", "其他设备", "healthy", 0, 78],
  ["SRC-012", "授权产品数据 API", "api", "授权数据服务", "多品牌", "综合", "warning", 2, 81],
  ["SRC-013", "Grundfos PDF样本下载中心", "pdf_datasheet", "格兰富水泵（上海）有限公司", "Grundfos", "水泵设备", "healthy", 0, 90],
].map(([id, name, type, supplierName, brand, category, healthStatus, failureCount, confidence], index) => ({
  id: String(id), name: String(name), type: String(type), supplierName: String(supplierName), brand: String(brand),
  url: String(type).includes("site") || type === "manufacturer_site" ? `https://example.com/source/${id}` : undefined,
  equipmentCategories: [String(category)], healthStatus: healthStatus as SourceHealthStatus,
  lastCollectedAt: `2026-08-${String(22 - (index % 5)).padStart(2, "0")} ${String(9 + index).padStart(2, "0")}:20`,
  failureCount: Number(failureCount), confidenceLevel: Number(confidence) >= 90 ? "A" : Number(confidence) >= 80 ? "B" : Number(confidence) >= 70 ? "C" : "D",
  normalCount: 8 + (index % 5) * 3, abnormalCount: Number(failureCount),
}));

export const collectionMethods: CollectionMethod[] = [
  { id: "MTH-001", name: "官网网页采集", applicableSourceTypes: ["manufacturer_site", "supplier_site"], parseTarget: "webpage", aiEnabled: true, dedupeEnabled: true, standardizationEnabled: true, retryEnabled: true, maxRetry: 3, reviewRequired: true, scheduled: true, taskCount: 4 },
  { id: "MTH-002", name: "PDF样本解析", applicableSourceTypes: ["pdf_datasheet"], parseTarget: "pdf", aiEnabled: true, dedupeEnabled: true, standardizationEnabled: true, retryEnabled: true, maxRetry: 2, reviewRequired: true, scheduled: false, taskCount: 2 },
  { id: "MTH-003", name: "产品目录解析", applicableSourceTypes: ["product_catalog"], parseTarget: "mixed", aiEnabled: true, dedupeEnabled: true, standardizationEnabled: true, retryEnabled: true, maxRetry: 3, reviewRequired: true, scheduled: true, taskCount: 3 },
  { id: "MTH-004", name: "Excel目录导入", applicableSourceTypes: ["excel_catalog"], parseTarget: "excel", aiEnabled: true, dedupeEnabled: true, standardizationEnabled: true, retryEnabled: false, maxRetry: 0, reviewRequired: true, scheduled: false, taskCount: 1 },
  { id: "MTH-005", name: "人工录入", applicableSourceTypes: ["manual_input"], parseTarget: "manual", aiEnabled: false, dedupeEnabled: true, standardizationEnabled: true, retryEnabled: false, maxRetry: 0, reviewRequired: true, scheduled: false, taskCount: 1 },
  { id: "MTH-006", name: "混合采集", applicableSourceTypes: ["api", "manufacturer_site", "product_catalog"], parseTarget: "mixed", aiEnabled: true, dedupeEnabled: true, standardizationEnabled: true, retryEnabled: true, maxRetry: 4, reviewRequired: true, scheduled: true, taskCount: 1 },
];

const taskSeeds = [
  ["Grundfos 水泵资料采集", 0, 0, "水泵设备", "running", 66, 1248, 356, 89, 2, 92, "采集网页"],
  ["KSB 阀门目录采集", 1, 2, "阀门设备", "paused", 35, 856, 242, 38, 3, 86, "解析产品目录"],
  ["AVK 电动蝶阀 PDF 解析", 2, 1, "阀门设备", "running", 100, 1024, 418, 0, 0, 84, "生成候选资料"],
  ["Endress+Hauser 仪表采集", 3, 0, "仪表设备", "running", 50, 632, 186, 63, 1, 96, "提取参数"],
  ["Siemens 电气设备目录", 4, 2, "电气设备", "queued", 0, 0, 0, 0, 0, 91, "等待调度"],
  ["Schneider Electric 电气采集", 5, 0, "电气设备", "running", 20, 210, 68, 12, 2, 78, "采集网页"],
  ["Tsurumi 水泵样本解析", 6, 1, "水泵设备", "failed", 0, 120, 0, 0, 12, 55, "解析PDF"],
  ["ABB 低压电气目录", 7, 2, "电气设备", "running", 41, 420, 152, 31, 1, 88, "去重合并"],
  ["Wilo 水泵目录采集", 8, 0, "水泵设备", "paused", 0, 0, 0, 0, 0, 80, "等待调度"],
  ["远东电缆产品目录", 9, 3, "电气设备", "needs_review", 100, 780, 312, 312, 0, 90, "等待人工审核"],
  ["项目设备台账人工导入", 10, 4, "其他设备", "completed", 100, 96, 48, 6, 0, 76, "已入库"],
  ["授权 API 综合设备同步", 11, 5, "综合", "archived", 100, 1856, 620, 0, 0, 81, "已入库"],
] as const;

export const equipmentCollectionTasks: EquipmentCatalogCollectionTask[] = taskSeeds.map((seed, index) => {
  const [taskName, sourceIndex, methodIndex, category, status, progress, pages, parsed, pending, failed, health, stage] = seed;
  const source = equipmentDataSources[sourceIndex];
  const method = collectionMethods[methodIndex];
  return {
    id: `TASK-${String(index + 1).padStart(3, "0")}`,
    taskCode: `COLL-202608-${String(index + 1).padStart(4, "0")}`,
    taskName,
    supplierName: source.supplierName,
    brand: source.brand,
    dataSourceId: source.id,
    dataSourceName: source.name,
    sourceType: source.type,
    collectionMethodId: method.id,
    collectionMethodName: method.name,
    equipmentCategory: category,
    collectionScope: `${source.brand} ${category} 产品系列与关键参数`,
    status,
    progress,
    collectedPages: pages,
    parsedEquipment: parsed,
    pendingReview: pending,
    failedCount: failed,
    sourceHealth: health,
    aiConfidence: Math.max(52, health - (index % 3) * 4),
    riskLevel: failed >= 5 || health < 65 ? "high" : failed > 0 || health < 85 ? "medium" : "low",
    currentStage: stage,
    lastRunAt: `2026-08-${String(22 - (index % 4)).padStart(2, "0")} ${String(9 + (index % 8)).padStart(2, "0")}:${index % 2 ? "30" : "15"}`,
    nextRunAt: `2026-08-24 ${String(8 + (index % 6)).padStart(2, "0")}:00`,
    createdAt: `2026-08-${String(10 + index).padStart(2, "0")}`,
    frequency: index % 3 === 0 ? "每6小时" : index % 3 === 1 ? "每日" : "手动",
    logs: [
      { id: `LOG-${index}-1`, time: "10:30:22", level: "success", message: `连接 ${source.name} 成功` },
      { id: `LOG-${index}-2`, time: "10:28:55", level: "info", message: `已解析 ${Math.max(0, parsed)} 条设备候选资料` },
      { id: `LOG-${index}-3`, time: "10:26:10", level: failed ? "warning" : "success", message: failed ? `${failed} 个来源页面等待重试` : "字段标准化与去重完成" },
    ],
  };
});

const equipmentNames = ["立式多级离心泵", "潜水排污泵", "电动蝶阀", "电磁流量计", "PLC 控制柜", "低压配电柜", "变频控制柜", "闸阀", "机械格栅机", "鼓风机", "计量加药泵", "超声波液位计", "软启动柜", "止回阀", "潜水搅拌机", "刮泥机", "压力变送器", "不锈钢水箱", "电力电缆", "紫外消毒器"];
export const recentExtractedEquipment: ExtractedEquipment[] = equipmentNames.map((name, index) => ({
  id: `EXT-${String(index + 1).padStart(3, "0")}`,
  taskId: equipmentCollectionTasks[index % equipmentCollectionTasks.length].id,
  name,
  brand: equipmentCollectionTasks[index % equipmentCollectionTasks.length].brand,
  model: ["CR 64-4", "SP 100-12", "DN300 PN16", "Promag 10", "S7-1200"][index % 5],
  category: equipmentCollectionTasks[index % equipmentCollectionTasks.length].equipmentCategory,
  confidence: 72 + (index % 6) * 4,
  reviewStatus: index % 4 === 0 ? "needs_info" : index % 3 === 0 ? "approved" : "pending",
}));

export const pendingCatalogReviews: PendingCatalogReview[] = recentExtractedEquipment.slice(0, 10).map((item, index) => ({
  id: `REV-${String(index + 1).padStart(3, "0")}`,
  taskId: item.taskId,
  name: item.name,
  brand: item.brand,
  missingParameters: ["扬程、材质", "执行器扭矩", "防护等级", "输出信号", "认证证书"][index % 5],
  riskLevel: index % 4 === 0 ? "high" : index % 3 === 0 ? "medium" : "low",
}));

export const collectionFailures: CollectionFailure[] = Array.from({ length: 10 }, (_, index) => ({
  id: `FAIL-${String(index + 1).padStart(3, "0")}`,
  taskId: equipmentCollectionTasks[(index + 2) % equipmentCollectionTasks.length].id,
  sourceName: equipmentDataSources[(index + 2) % equipmentDataSources.length].name,
  reason: ["连接超时", "PDF版式变化", "页面访问受限", "字段无法识别", "404 Not Found"][index % 5],
  failedAt: `08-${String(22 - (index % 5)).padStart(2, "0")} ${String(10 + index).padStart(2, "0")}:30`,
  retryCount: index % 4,
}));
