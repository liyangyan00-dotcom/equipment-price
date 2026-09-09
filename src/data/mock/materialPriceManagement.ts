import { materialKpis, materialPriceRecords } from "./materialPrices";

const completenessScores = [92, 88, 76, 84, 90, 74, 68, 82, 86, 70];
const missingFieldSets = [
  ["近期到场价", "供应商盖章"],
  ["无"],
  ["运费条件"],
  ["税率口径"],
  ["有效期"],
  ["产地"],
  ["规格证书"],
  ["发票条件"],
  ["近期报价来源"],
  ["运输半径"],
];

export const materialManagementKpis = [
  { ...materialKpis[0], value: "10" },
  { label: "待审核价格", value: "3", unit: "条", trend: "较昨日 +1", description: "需要人工确认" },
  { label: "本月新增", value: "8", unit: "条", trend: "+24.1%", description: "近30天新增记录" },
  { label: "AI整理记录", value: "6", unit: "条", trend: "入库率 79%", description: "自动清洗字段" },
  { label: "异常价格", value: "2", unit: "项", trend: "波动 >20%", description: "需要重点复核" },
  { label: "缺口地区", value: "5", unit: "个", trend: "Kinshasa", description: "采集覆盖不足" },
];

export const editableMaterialRecords = materialPriceRecords.map((item, index) => ({
  ...item,
  completeness: completenessScores[index] ?? 80,
  batchStatus: index % 3 === 0 ? "待审核" : index % 3 === 1 ? "已确认" : "需补充",
  missingFields: missingFieldSets[index] ?? ["无"],
  importBatch: `MAT-IMP-2026-${String(Math.floor(index / 3) + 1).padStart(2, "0")}`,
  owner: ["张工", "王工", "李工", "赵工"][index % 4],
  canArchive: item.reviewStatus === "confirmed",
}));

export type EditableMaterialRecord = (typeof editableMaterialRecords)[number];

export const materialCollectionSuggestions = [
  {
    title: "Kinshasa 钢筋到场价缺口",
    count: "12 条",
    description: "HRB400 Φ16/Φ20 近30天缺少可用供应商报价。",
    action: "去采集",
  },
  {
    title: "Matadi 砂石运输条件缺失",
    count: "8 条",
    description: "建议补充含运费到场条件，避免项目套价偏差。",
    action: "补充条件",
  },
  {
    title: "PVC 管材有效期临近",
    count: "5 条",
    description: "有效期将在 15 天内到期，建议本周发起询价刷新。",
    action: "创建询价",
  },
];

export const materialBatchReviewItems = [
  { title: "普通硅酸盐水泥 42.5R", meta: "缺失税率口径，有效期需确认", status: "需补充" },
  { title: "HRB400 螺纹钢 Φ20mm", meta: "AI识别置信度 93%，可直接复核", status: "待审核" },
  { title: "P.042.5 水泥", meta: "地区价格波动超过 20%", status: "异常" },
];

export const materialQualityStats = [
  { label: "资料完整", value: "68", tone: "green" },
  { label: "待补充", value: "15", tone: "orange" },
  { label: "需复核", value: "12", tone: "purple" },
];
