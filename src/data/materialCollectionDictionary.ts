export const materialKeywordGroups = [
  {
    label: "水泥与砂浆",
    items: ["水泥", "普通硅酸盐水泥", "复合硅酸盐水泥", "矿渣硅酸盐水泥", "白水泥", "散装水泥", "袋装水泥", "预拌混凝土", "干混砂浆", "砌筑砂浆", "抹灰砂浆", "灌浆料", "瓷砖胶", "界面剂", "腻子粉"],
  },
  {
    label: "砂石骨料",
    items: ["河砂", "机制砂", "中砂", "粗砂", "细砂", "碎石", "卵石", "石粉", "级配碎石", "块石", "毛石", "石灰"],
  },
  {
    label: "钢材与金属",
    items: ["钢筋", "盘圆", "盘螺", "工字钢", "H型钢", "槽钢", "角钢", "扁钢", "圆钢", "钢板", "镀锌钢板", "不锈钢板", "方管", "矩形管", "焊管", "无缝钢管", "镀锌钢管", "钢丝网", "铁丝", "铝合金型材"],
  },
  {
    label: "砖块与预制品",
    items: ["红砖", "页岩砖", "混凝土实心砖", "空心砖", "砌块", "加气混凝土砌块", "路面砖", "透水砖", "路缘石", "预制混凝土板", "预制混凝土桩"],
  },
  {
    label: "木材与模板",
    items: ["原木", "方木", "木模板", "胶合板", "竹胶板", "建筑木方"],
  },
  {
    label: "管材管件",
    items: ["PVC给水管", "PVC排水管", "UPVC管", "HDPE给水管", "PE管", "PPR给水管", "球墨铸铁管", "钢筋混凝土管", "双壁波纹管", "电缆保护管", "管件"],
  },
  {
    label: "防水保温",
    items: ["防水卷材", "防水涂料", "沥青", "密封胶", "保温板", "挤塑板", "岩棉板", "玻璃棉"],
  },
  {
    label: "装饰装修",
    items: ["地砖", "墙砖", "花岗岩", "大理石", "乳胶漆", "油漆", "石膏板", "轻钢龙骨", "玻璃", "吊顶板", "门窗型材"],
  },
  {
    label: "电气辅材与五金",
    items: ["电力电缆", "控制电缆", "电线", "电缆桥架", "线管", "配电箱", "水泥钉", "圆钉", "螺栓", "螺母", "焊条", "扎丝"],
  },
] as const;

export const materialKeywordOptions = materialKeywordGroups.flatMap((group) => [...group.items]);

const specificationsByMaterial: Record<string, string[]> = {
  水泥: ["32.5 / 50kg", "32.5R / 50kg", "42.5 / 50kg", "42.5R / 50kg", "52.5 / 50kg", "散装 / 吨"],
  普通硅酸盐水泥: ["P.O 32.5 / 50kg", "P.O 42.5 / 50kg", "P.O 42.5R / 50kg", "P.O 52.5 / 50kg"],
  复合硅酸盐水泥: ["P.C 32.5 / 50kg", "P.C 42.5 / 50kg"],
  矿渣硅酸盐水泥: ["P.S 32.5 / 50kg", "P.S 42.5 / 50kg"],
  白水泥: ["32.5 / 25kg", "42.5 / 25kg", "50kg/袋"],
  预拌混凝土: ["C15", "C20", "C25", "C30", "C35", "C40", "C45", "C50"],
  干混砂浆: ["M5", "M7.5", "M10", "M15", "M20"],
  砌筑砂浆: ["M5", "M7.5", "M10", "M15"],
  抹灰砂浆: ["M5", "M10", "M15", "M20"],
  瓷砖胶: ["C1 / 20kg", "C1T / 20kg", "C2 / 20kg", "C2TE / 20kg"],
  河砂: ["细砂 0.25-0.35mm", "中砂 0.35-0.50mm", "粗砂 0.50mm以上", "散装 / m³", "散装 / 吨"],
  机制砂: ["0-3mm", "0-5mm", "散装 / m³", "散装 / 吨"],
  碎石: ["5-10mm", "10-20mm", "16-31.5mm", "20-40mm", "散装 / m³", "散装 / 吨"],
  卵石: ["5-10mm", "10-20mm", "20-40mm", "40-80mm"],
  钢筋: ["HPB300 Φ6", "HPB300 Φ8", "HRB400 Φ8", "HRB400 Φ10", "HRB400 Φ12", "HRB400 Φ14", "HRB400 Φ16", "HRB400 Φ18", "HRB400 Φ20", "HRB400 Φ22", "HRB400 Φ25", "HRB400 Φ28", "HRB400 Φ32"],
  盘圆: ["HPB300 Φ6", "HPB300 Φ8", "HPB300 Φ10"],
  盘螺: ["HRB400 Φ6", "HRB400 Φ8", "HRB400 Φ10", "HRB400 Φ12"],
  工字钢: ["I10", "I12", "I14", "I16", "I18", "I20", "I25", "I30"],
  H型钢: ["H100×100", "H150×150", "H200×200", "H250×250", "H300×300"],
  槽钢: ["5#", "8#", "10#", "12#", "14#", "16#", "20#"],
  角钢: ["L30×3", "L40×4", "L50×5", "L63×5", "L75×6", "L100×10"],
  钢板: ["2mm", "3mm", "4mm", "5mm", "6mm", "8mm", "10mm", "12mm", "16mm", "20mm"],
  方管: ["20×20×1.5mm", "40×40×2mm", "50×50×2.5mm", "80×80×3mm", "100×100×4mm"],
  红砖: ["240×115×53mm", "200×100×60mm"],
  空心砖: ["240×115×90mm", "390×190×190mm"],
  砌块: ["390×190×190mm", "390×190×140mm", "390×190×90mm"],
  加气混凝土砌块: ["600×200×100mm", "600×200×150mm", "600×200×200mm", "强度A3.5", "强度A5.0"],
  胶合板: ["1220×2440×9mm", "1220×2440×12mm", "1220×2440×15mm", "1220×2440×18mm"],
  PVC给水管: ["DN20 PN10", "DN25 PN10", "DN32 PN10", "DN50 PN10", "DN75 PN10", "DN100 PN10", "DN150 PN10", "DN200 PN10"],
  PVC排水管: ["DN50", "DN75", "DN110", "DN160", "DN200", "DN315"],
  HDPE给水管: ["DN50 PN10", "DN63 PN10", "DN90 PN10", "DN110 PN10", "DN160 PN10", "DN200 PN10", "DN315 PN10"],
  PE管: ["DN20", "DN25", "DN32", "DN50", "DN63", "DN90", "DN110", "DN160", "DN200"],
  球墨铸铁管: ["DN80 K9", "DN100 K9", "DN150 K9", "DN200 K9", "DN300 K9", "DN400 K9", "DN500 K9"],
  钢筋混凝土管: ["DN300", "DN400", "DN500", "DN600", "DN800", "DN1000", "DN1200"],
  防水卷材: ["SBS 3mm", "SBS 4mm", "APP 3mm", "APP 4mm", "1m×10m/卷"],
  地砖: ["300×300mm", "600×600mm", "800×800mm", "600×1200mm"],
  墙砖: ["300×600mm", "400×800mm", "600×1200mm"],
  电力电缆: ["YJV 3×2.5mm²", "YJV 3×4mm²", "YJV 4×10mm²", "YJV 4×25mm²", "YJV 4×50mm²", "YJV 4×95mm²"],
  电线: ["BV 1.5mm²", "BV 2.5mm²", "BV 4mm²", "BV 6mm²", "BV 10mm²"],
  螺栓: ["M8", "M10", "M12", "M16", "M20", "M24", "M30"],
};

const genericMaterialSpecifications = ["按吨", "按公斤", "按袋", "按件", "按块", "按米", "按平方米", "按立方米"];

export function getMaterialSpecificationOptions(keyword: string) {
  const normalized = keyword.trim();
  if (!normalized) return genericMaterialSpecifications;
  const direct = specificationsByMaterial[normalized];
  if (direct) return direct;
  const related = Object.entries(specificationsByMaterial).find(([name]) => normalized.includes(name) || name.includes(normalized));
  return related?.[1] ?? genericMaterialSpecifications;
}

export function getMaterialSpecificationOptionsForKeywords(keywords: string[]) {
  if (!keywords.length) return genericMaterialSpecifications;
  return Array.from(
    new Set(keywords.flatMap((keyword) => getMaterialSpecificationOptions(keyword))),
  );
}

export const collectionRegionOptions = [
  "刚果金全国 / DRC Nationwide",
  "Kinshasa / 金沙萨",
  "Matadi / 马塔迪",
  "Boma / 博马",
  "Lubumbashi / 卢本巴希",
  "Kolwezi / 科卢韦齐",
  "Likasi / 利卡西",
  "Goma / 戈马",
  "Bukavu / 布卡武",
  "Kisangani / 基桑加尼",
  "Mbuji-Mayi / 姆布吉马伊",
  "Kananga / 卡南加",
  "Tshikapa / 奇卡帕",
  "Kikwit / 基奎特",
  "Bandundu / 班顿杜",
  "Kenge / 肯盖",
  "Inongo / 伊农戈",
  "Mbandaka / 姆班达卡",
  "Gemena / 盖梅纳",
  "Lisala / 利萨拉",
  "Gbadolite / 格巴多利特",
  "Bunia / 布尼亚",
  "Isiro / 伊西罗",
  "Buta / 布塔",
  "Kindu / 金杜",
  "Kalemie / 卡莱米",
  "Kamina / 卡米纳",
  "Kabinda / 卡宾达",
  "Lusambo / 卢桑博",
  "全国 / 中国",
  "北京", "上海", "广州", "深圳", "南京", "杭州", "天津", "重庆", "成都", "武汉", "西安", "郑州", "长沙", "济南", "青岛", "苏州", "佛山",
];
