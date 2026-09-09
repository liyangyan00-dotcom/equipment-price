import type {
  EquipmentCatalogParameter,
  EquipmentCatalogRecord,
} from "@/types/equipmentCatalog";

export type EquipmentParameterGroupKey =
  | "performance"
  | "construction"
  | "materials"
  | "electrical"
  | "dimensions"
  | "documents"
  | "other";

export type EquipmentParameterRequirement = {
  key: string;
  label: string;
  group: EquipmentParameterGroupKey;
  aliases: string[];
  critical?: boolean;
};

export type EquipmentQualityEvaluation = {
  templateKey: string;
  templateLabel: string;
  score: number;
  identityScore: number;
  parameterScore: number;
  evidenceScore: number;
  matchedParameterCount: number;
  requiredParameterCount: number;
  missingFields: Array<{
    key: string;
    label: string;
    group: EquipmentParameterGroupKey | "identity" | "evidence";
    critical: boolean;
  }>;
  approvalReady: boolean;
};

export const PARAMETER_GROUP_LABELS: Record<
  EquipmentParameterGroupKey,
  string
> = {
  performance: "性能参数",
  construction: "结构与连接",
  materials: "材质与密封",
  electrical: "电气与驱动",
  dimensions: "尺寸与重量",
  documents: "标准与认证",
  other: "其他参数",
};

const commonRequirements: EquipmentParameterRequirement[] = [
  {
    key: "material",
    label: "主要材质",
    group: "materials",
    aliases: ["材质", "材料", "泵体材质", "阀体材质", "material"],
  },
  {
    key: "connection",
    label: "连接方式 / 口径",
    group: "construction",
    aliases: ["连接", "口径", "法兰", "公称直径", "dn", "connection"],
  },
  {
    key: "standard",
    label: "执行标准 / 认证",
    group: "documents",
    aliases: ["标准", "认证", "证书", "standard", "certificate"],
  },
];

const templates: Array<{
  key: string;
  label: string;
  categoryAliases: string[];
  requirements: EquipmentParameterRequirement[];
}> = [
  {
    key: "pump",
    label: "水泵设备",
    categoryAliases: ["水泵", "泵", "pump"],
    requirements: [
      {
        key: "flow",
        label: "流量",
        group: "performance",
        aliases: ["流量", "最大流量", "额定流量", "flow", "capacity"],
        critical: true,
      },
      {
        key: "head",
        label: "扬程",
        group: "performance",
        aliases: ["扬程", "最大扬程", "额定扬程", "head"],
        critical: true,
      },
      {
        key: "power",
        label: "电机功率",
        group: "electrical",
        aliases: ["功率", "电机功率", "额定功率", "power", "kw"],
      },
      {
        key: "efficiency",
        label: "效率",
        group: "performance",
        aliases: ["效率", "泵效率", "efficiency"],
      },
      {
        key: "speed",
        label: "转速",
        group: "performance",
        aliases: ["转速", "rpm", "speed"],
      },
      {
        key: "npsh",
        label: "必需汽蚀余量 NPSHr",
        group: "performance",
        aliases: ["汽蚀余量", "npsh", "npshr"],
      },
      {
        key: "pressure",
        label: "允许压力",
        group: "performance",
        aliases: ["压力", "最大压力", "允许压力", "pressure", "bar"],
      },
      {
        key: "temperature",
        label: "介质温度",
        group: "performance",
        aliases: ["温度", "介质温度", "temperature"],
      },
      {
        key: "seal",
        label: "密封形式",
        group: "materials",
        aliases: ["密封", "机械密封", "seal"],
      },
      {
        key: "voltage",
        label: "电压 / 频率",
        group: "electrical",
        aliases: ["电压", "频率", "voltage", "frequency", "hz"],
      },
      ...commonRequirements,
    ],
  },
  {
    key: "valve",
    label: "阀门设备",
    categoryAliases: ["阀门", "蝶阀", "闸阀", "止回阀", "valve"],
    requirements: [
      {
        key: "diameter",
        label: "公称直径 DN",
        group: "construction",
        aliases: ["口径", "公称直径", "dn", "diameter"],
        critical: true,
      },
      {
        key: "pressure",
        label: "公称压力 PN",
        group: "performance",
        aliases: ["压力", "公称压力", "pn", "pressure"],
        critical: true,
      },
      {
        key: "actuator",
        label: "驱动 / 执行器",
        group: "electrical",
        aliases: ["驱动", "执行器", "扭矩", "actuator", "torque"],
      },
      {
        key: "temperature",
        label: "适用温度",
        group: "performance",
        aliases: ["温度", "temperature"],
      },
      ...commonRequirements,
    ],
  },
  {
    key: "instrument",
    label: "仪表设备",
    categoryAliases: ["仪表", "流量计", "液位计", "分析仪", "meter", "instrument"],
    requirements: [
      {
        key: "range",
        label: "量程",
        group: "performance",
        aliases: ["量程", "测量范围", "range"],
        critical: true,
      },
      {
        key: "accuracy",
        label: "精度",
        group: "performance",
        aliases: ["精度", "accuracy"],
        critical: true,
      },
      {
        key: "output",
        label: "输出 / 通讯",
        group: "electrical",
        aliases: ["输出", "通讯", "信号", "output", "hart", "modbus"],
      },
      {
        key: "protection",
        label: "防护等级",
        group: "construction",
        aliases: ["防护等级", "ip等级", "protection", "ip65", "ip67", "ip68"],
      },
      ...commonRequirements,
    ],
  },
  {
    key: "electrical",
    label: "电气设备",
    categoryAliases: ["电气", "配电", "控制柜", "变频", "电缆", "plc", "electrical"],
    requirements: [
      {
        key: "voltage",
        label: "额定电压",
        group: "electrical",
        aliases: ["电压", "额定电压", "voltage"],
        critical: true,
      },
      {
        key: "power",
        label: "额定功率 / 电流",
        group: "electrical",
        aliases: ["功率", "电流", "power", "current"],
        critical: true,
      },
      {
        key: "protection",
        label: "防护等级",
        group: "construction",
        aliases: ["防护等级", "ip等级", "protection"],
      },
      {
        key: "shortCircuit",
        label: "短路耐受能力",
        group: "electrical",
        aliases: ["短路", "分断", "short circuit", "ka"],
      },
      ...commonRequirements,
    ],
  },
  {
    key: "blower",
    label: "风机与曝气设备",
    categoryAliases: ["风机", "鼓风机", "曝气", "blower", "fan"],
    requirements: [
      {
        key: "flow",
        label: "风量",
        group: "performance",
        aliases: ["风量", "流量", "air flow", "flow"],
        critical: true,
      },
      {
        key: "pressure",
        label: "升压 / 压力",
        group: "performance",
        aliases: ["升压", "压力", "压差", "pressure"],
        critical: true,
      },
      {
        key: "power",
        label: "电机功率",
        group: "electrical",
        aliases: ["功率", "电机功率", "power"],
      },
      {
        key: "noise",
        label: "噪声",
        group: "performance",
        aliases: ["噪声", "noise", "db"],
      },
      ...commonRequirements,
    ],
  },
  {
    key: "dosing",
    label: "加药设备",
    categoryAliases: ["加药", "投药", "计量泵", "药剂制备", "dosing", "chemical feed"],
    requirements: [
      {
        key: "capacity",
        label: "投加能力 / 流量",
        group: "performance",
        aliases: ["投加量", "投加能力", "流量", "处理量", "capacity", "flow"],
        critical: true,
      },
      {
        key: "chemical",
        label: "适用药剂",
        group: "materials",
        aliases: ["药剂", "介质", "pac", "pam", "次氯酸钠", "chemical", "medium"],
        critical: true,
      },
      {
        key: "concentration",
        label: "配制 / 投加浓度",
        group: "performance",
        aliases: ["浓度", "配制浓度", "concentration"],
      },
      {
        key: "accuracy",
        label: "计量精度",
        group: "performance",
        aliases: ["精度", "计量精度", "accuracy"],
      },
      {
        key: "tankVolume",
        label: "储罐 / 溶药箱容积",
        group: "dimensions",
        aliases: ["容积", "储罐", "溶药箱", "tank", "volume"],
      },
      {
        key: "control",
        label: "控制方式",
        group: "electrical",
        aliases: ["控制", "自动控制", "变频", "plc", "control"],
      },
      {
        key: "power",
        label: "装机功率",
        group: "electrical",
        aliases: ["功率", "装机功率", "power", "kw"],
      },
      ...commonRequirements,
    ],
  },
  {
    key: "screen",
    label: "格栅与拦污设备",
    categoryAliases: ["格栅", "拦污", "除污机", "screen", "bar screen"],
    requirements: [
      {
        key: "channelWidth",
        label: "渠道 / 设备宽度",
        group: "dimensions",
        aliases: ["渠道宽度", "设备宽度", "格栅宽度", "width"],
        critical: true,
      },
      {
        key: "barSpacing",
        label: "栅隙",
        group: "construction",
        aliases: ["栅隙", "间隙", "bar spacing", "spacing"],
        critical: true,
      },
      {
        key: "dischargeHeight",
        label: "卸料高度",
        group: "dimensions",
        aliases: ["卸料高度", "出渣高度", "discharge height"],
      },
      {
        key: "installationAngle",
        label: "安装角度",
        group: "construction",
        aliases: ["安装角度", "倾角", "installation angle"],
      },
      {
        key: "power",
        label: "电机功率",
        group: "electrical",
        aliases: ["功率", "电机功率", "power", "kw"],
      },
      {
        key: "material",
        label: "栅条 / 机架材质",
        group: "materials",
        aliases: ["材质", "栅条材质", "机架材质", "不锈钢", "material"],
      },
      {
        key: "protection",
        label: "电机防护等级",
        group: "electrical",
        aliases: ["防护等级", "ip等级", "protection"],
      },
      {
        key: "standard",
        label: "执行标准 / 认证",
        group: "documents",
        aliases: ["标准", "认证", "standard", "certificate"],
      },
    ],
  },
  {
    key: "generic",
    label: "通用设备",
    categoryAliases: [],
    requirements: [
      {
        key: "capacity",
        label: "额定能力 / 处理量",
        group: "performance",
        aliases: ["能力", "处理量", "流量", "产量", "capacity", "flow"],
        critical: true,
      },
      {
        key: "power",
        label: "功率 / 能耗",
        group: "electrical",
        aliases: ["功率", "能耗", "power"],
      },
      {
        key: "dimensions",
        label: "外形尺寸 / 重量",
        group: "dimensions",
        aliases: ["尺寸", "长", "宽", "高", "重量", "dimension", "weight"],
      },
      ...commonRequirements,
    ],
  },
];

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_/·（）()\[\]：:，,。.\-]/g, "");
}

function hasValue(value: unknown) {
  const normalized = normalize(value);
  return Boolean(normalized && !["待补充", "待核验", "未知", "--", "null"].includes(normalized));
}

export function getEquipmentParameterTemplate(record: Pick<
  EquipmentCatalogRecord,
  "equipment_category" | "equipment_type" | "equipment_name"
>) {
  const haystack = normalize(
    `${record.equipment_category} ${record.equipment_type} ${record.equipment_name}`,
  );
  return (
    templates.find((template) =>
      template.categoryAliases.some((alias) => haystack.includes(normalize(alias))),
    ) ?? templates[templates.length - 1]
  );
}

function requirementMatches(
  requirement: EquipmentParameterRequirement,
  parameter: EquipmentCatalogParameter,
) {
  if (!hasValue(parameter.normalized_value || parameter.raw_value)) return false;
  const haystack = normalize(
    `${parameter.parameter_code} ${parameter.parameter_name} ${parameter.unit}`,
  );
  return requirement.aliases.some((alias) => haystack.includes(normalize(alias)));
}

export function getParameterGroup(parameter: EquipmentCatalogParameter) {
  const haystack = normalize(
    `${parameter.parameter_code} ${parameter.parameter_name} ${parameter.unit}`,
  );
  const templateRequirement = templates
    .flatMap((template) => template.requirements)
    .find((requirement) =>
      requirement.aliases.some((alias) => haystack.includes(normalize(alias))),
    );
  if (templateRequirement) return templateRequirement.group;
  if (/尺寸|重量|长度|宽度|高度|dimension|weight/.test(haystack)) return "dimensions";
  if (/电压|电流|功率|频率|防护|voltage|current|power|hz|ip/.test(haystack)) return "electrical";
  if (/材质|材料|密封|material|seal/.test(haystack)) return "materials";
  if (/标准|认证|证书|standard|certificate/.test(haystack)) return "documents";
  return "other";
}

export function groupEquipmentParameters(parameters: EquipmentCatalogParameter[]) {
  const groups = new Map<EquipmentParameterGroupKey, EquipmentCatalogParameter[]>();
  parameters.forEach((parameter) => {
    const key = getParameterGroup(parameter);
    groups.set(key, [...(groups.get(key) ?? []), parameter]);
  });
  const order: EquipmentParameterGroupKey[] = [
    "performance",
    "construction",
    "materials",
    "electrical",
    "dimensions",
    "documents",
    "other",
  ];
  return order
    .filter((key) => (groups.get(key)?.length ?? 0) > 0)
    .map((key) => ({ key, label: PARAMETER_GROUP_LABELS[key], parameters: groups.get(key)! }));
}

export function evaluateEquipmentCatalogQuality(
  record: EquipmentCatalogRecord,
  parameters: EquipmentCatalogParameter[],
  sources: Array<{ source_url?: string | null; review_status?: string }> = [],
): EquipmentQualityEvaluation {
  const template = getEquipmentParameterTemplate(record);
  const identityRequirements = [
    ["equipment_name", "设备名称", record.equipment_name, true],
    ["equipment_category", "设备类别", record.equipment_category, true],
    ["equipment_type", "细分类型", record.equipment_type, true],
    ["brand", "品牌 / 制造商", record.brand || record.manufacturer, true],
    ["model", "型号 / 产品系列", record.model || record.product_series, true],
    ["specification", "规格摘要", record.specification, false],
    ["application", "应用场景", record.application, false],
    ["technical_standard", "技术标准", record.technical_standard, false],
    ["country_code", "原产国 / 地区", record.country_code, false],
    ["language", "资料语言", record.language, false],
  ] as const;

  const missingFields: EquipmentQualityEvaluation["missingFields"] = [];
  const identityMatched = identityRequirements.filter((item) => hasValue(item[2])).length;
  identityRequirements.forEach(([key, label, value, critical]) => {
    if (!hasValue(value)) missingFields.push({ key, label, group: "identity", critical });
  });

  let matchedParameterCount = 0;
  template.requirements.forEach((requirement) => {
    if (parameters.some((parameter) => requirementMatches(requirement, parameter))) {
      matchedParameterCount += 1;
    } else {
      missingFields.push({
        key: requirement.key,
        label: requirement.label,
        group: requirement.group,
        critical: Boolean(requirement.critical),
      });
    }
  });

  const directUrls = [record.source_url, record.catalog_url, record.datasheet_url].filter(hasValue);
  const sourceUrls = sources.filter((source) => hasValue(source.source_url));
  const evidenceChecks = [
    directUrls.length + sourceUrls.length > 0,
    Boolean(record.datasheet_url || record.catalog_url),
    sourceUrls.some((source) => source.review_status === "approved"),
  ];
  if (!evidenceChecks[0])
    missingFields.push({ key: "source", label: "可追溯原始来源", group: "evidence", critical: true });
  if (!evidenceChecks[1])
    missingFields.push({ key: "document", label: "产品目录或技术样本", group: "evidence", critical: false });

  const identityScore = Math.round((identityMatched / identityRequirements.length) * 35);
  const parameterScore = Math.round(
    (matchedParameterCount / Math.max(template.requirements.length, 1)) * 50,
  );
  const evidenceScore = Math.round(
    (evidenceChecks.filter(Boolean).length / evidenceChecks.length) * 15,
  );
  const score = Math.min(100, identityScore + parameterScore + evidenceScore);
  const parameterCoverage = matchedParameterCount / Math.max(template.requirements.length, 1);
  const approvalReady =
    score >= 70 &&
    parameterCoverage >= 0.6 &&
    !missingFields.some((field) => field.critical);

  return {
    templateKey: template.key,
    templateLabel: template.label,
    score,
    identityScore,
    parameterScore,
    evidenceScore,
    matchedParameterCount,
    requiredParameterCount: template.requirements.length,
    missingFields,
    approvalReady,
  };
}
