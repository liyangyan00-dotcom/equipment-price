import type {
  EquipmentImportMapping,
  EquipmentImportRow,
} from "@/types/equipmentImport";

export const equipmentImportSystemFields = [
  { value: "equipment_name", label: "设备名称" },
  { value: "model", label: "规格型号" },
  { value: "brand", label: "品牌" },
  { value: "category", label: "设备类别" },
  { value: "original_price", label: "原始价格（含税）" },
  { value: "original_currency", label: "币种" },
  { value: "supplier_name", label: "供应商名称" },
  { value: "quote_date", label: "报价日期" },
  { value: "price_term", label: "价格条件" },
  { value: "ignore", label: "忽略该字段" },
] as const;

export const initialEquipmentImportMappings: EquipmentImportMapping[] = [
  { id: "map-1", sourceField: "设备名称", systemField: "equipment_name", sampleValue: "多介质过滤器", confidence: 98, status: "mapped", required: true },
  { id: "map-2", sourceField: "规格型号", systemField: "model", sampleValue: "Φ2600×3800", confidence: 95, status: "mapped", required: true },
  { id: "map-3", sourceField: "品牌", systemField: "brand", sampleValue: "威立雅", confidence: 93, status: "mapped", required: false },
  { id: "map-4", sourceField: "设备类别", systemField: "category", sampleValue: "过滤设备", confidence: 90, status: "mapped", required: true },
  { id: "map-5", sourceField: "原始价格", systemField: "original_price", sampleValue: "158000.00", confidence: 97, status: "mapped", required: true },
  { id: "map-6", sourceField: "币种", systemField: "original_currency", sampleValue: "USD", confidence: 100, status: "mapped", required: true },
  { id: "map-7", sourceField: "供应商", systemField: "supplier_name", sampleValue: "Veolia Water", confidence: 88, status: "warning", required: true },
  { id: "map-8", sourceField: "报价日期", systemField: "quote_date", sampleValue: "2026-07-28", confidence: 91, status: "mapped", required: true },
];

export const initialEquipmentImportRows: EquipmentImportRow[] = [
  { id: "row-1", rowNumber: 1, equipmentName: "多介质过滤器", model: "Φ2600×3800", brand: "威立雅", category: "过滤设备", originalPrice: 158000, currency: "USD", supplier: "Veolia Water", quoteDate: "2026-07-28", status: "valid", confidence: 96, issues: [], selected: true },
  { id: "row-2", rowNumber: 2, equipmentName: "活性炭过滤器", model: "Φ2400×3500", brand: "威立雅", category: "过滤设备", originalPrice: 128000, currency: "USD", supplier: "Veolia Water", quoteDate: "2026-07-28", status: "valid", confidence: 94, issues: [], selected: true },
  { id: "row-3", rowNumber: 3, equipmentName: "超滤装置", model: "UF-200", brand: "中船重工", category: "膜处理设备", originalPrice: 265000, currency: "USD", supplier: "中船重工七一一所", quoteDate: "2026-07-29", status: "warning", confidence: 82, issues: ["缺少膜组件材质"], selected: true },
  { id: "row-4", rowNumber: 4, equipmentName: "反渗透装置", model: "RO-1000", brand: "海德能", category: "膜处理设备", originalPrice: 328000, currency: "USD", supplier: "海德能", quoteDate: "2026-07-29", status: "duplicate", confidence: 88, issues: ["与 EQP-2026-0009 相似度 93%"], selected: false },
  { id: "row-5", rowNumber: 5, equipmentName: "加药装置", model: "JY-2000L", brand: "新界泵业", category: "加药设备", originalPrice: 18600, currency: "USD", supplier: "新界泵业", quoteDate: "2026-07-29", status: "valid", confidence: 92, issues: [], selected: true },
  { id: "row-6", rowNumber: 6, equipmentName: "潜水排污泵", model: "WQ250-15-18.5", brand: "凯泉", category: "水泵及泵站", originalPrice: 9800, currency: "USD", supplier: "上海凯泉泵业（集团）有限公司", quoteDate: "2026-07-29", status: "valid", confidence: 95, issues: [], selected: true },
  { id: "row-7", rowNumber: 7, equipmentName: "电动蝶阀", model: "DN300 PN16", brand: "冠龙", category: "阀门与管道配件", originalPrice: 4600, currency: "USD", supplier: "上海冠龙阀门节能设备股份有限公司", quoteDate: "2026-07-29", status: "warning", confidence: 76, issues: ["缺少执行器扭矩", "防护等级待补全"], selected: true },
  { id: "row-8", rowNumber: 8, equipmentName: "低压配电柜", model: "GGD", brand: "正泰", category: "自动化与动力", originalPrice: 23500, currency: "USD", supplier: "正泰电气股份有限公司", quoteDate: "2026-07-30", status: "valid", confidence: 91, issues: [], selected: true },
  { id: "row-9", rowNumber: 9, equipmentName: "在线浊度仪", model: "TU5300", brand: "哈希", category: "实验室及辅助设备", originalPrice: 7200, currency: "USD", supplier: "哈希水质分析仪器（上海）有限公司", quoteDate: "2026-07-30", status: "error", confidence: 58, issues: ["币种为空", "报价日期格式异常"], selected: false },
  { id: "row-10", rowNumber: 10, equipmentName: "鼓风机", model: "BK6008", brand: "百事德", category: "水处理工艺设备", originalPrice: 31400, currency: "USD", supplier: "百事德机械（江苏）有限公司", quoteDate: "2026-07-30", status: "valid", confidence: 90, issues: [], selected: true },
];
