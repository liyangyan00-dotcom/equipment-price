import { materialKpis, materialPriceRecords } from "./materialPrices";

export const materialManagementKpis = [
  materialKpis[0],
  { label: "待审核价格", value: "32", unit: "条", trend: "较昨日 +6", description: "需人工确认" },
  { label: "本月新增", value: "328", unit: "条", trend: "+24.1%", description: "近30天新增" },
  { label: "AI整理记录", value: "68", unit: "条", trend: "入库率 79%", description: "自动清洗字段" },
  { label: "异常价格", value: "14", unit: "种", trend: "波动 >20%", description: "需关注" },
  { label: "缺口地区", value: "5", unit: "个", trend: "Kinshasa", description: "采集不足" },
];

export const editableMaterialRecords = materialPriceRecords.map((item, index) => ({
  ...item,
  completeness: [92, 88, 76, 84, 90, 74, 68, 82][index] ?? 80,
  batchStatus: index % 3 === 0 ? "待审核" : index % 3 === 1 ? "已确认" : "需补充",
}));

export const materialCollectionSuggestions = [
  { name: "沥青（60/70）", region: "Kinshasa, Matadi", source: "供应商网站", gap: "高", action: "去采集" },
  { name: "钢绞线（15.2mm）", region: "Kinshasa", source: "行业媒体", gap: "中", action: "去采集" },
  { name: "PVC管（DN160）", region: "Kinshasa", source: "招投标平台", gap: "低", action: "去采集" },
];

export const materialBatchReviewItems = [
  { label: "待审核记录", value: 32, action: "批量确认" },
  { label: "异常价格", value: 14, action: "价格复核" },
  { label: "过期价格", value: 21, action: "重新采集" },
  { label: "缺失字段", value: 18, action: "AI补全" },
];
