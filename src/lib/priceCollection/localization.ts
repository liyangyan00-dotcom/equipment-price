const DRC_REGION_LABELS: Record<string, string> = {
  DRC: "刚果（金）",
  KINSHASA: "金沙萨",
  "HAUT-KATANGA": "上加丹加",
  "HAUT-UELE": "上韦莱",
  KASAI: "开赛",
  "KASAI CENTRAL": "中开赛",
  "KASAI-ORIENTAL": "东开赛",
  KWILU: "奎卢",
  LUALABA: "卢阿拉巴",
  "KONGO CENTRAL": "中刚果",
  "BAS-UELE": "下韦莱",
  EQUATEUR: "赤道",
  "HAUT-LOMAMI": "上洛马米",
  ITURI: "伊图里",
  KWANGO: "宽果",
  LOMAMI: "洛马米",
  "MAI-NDOMBE": "马伊恩东贝",
  MANIEMA: "马涅马",
  MONGALA: "蒙加拉",
  "NORD-KIVU": "北基伍",
  "NORD-UBANGI": "北乌班吉",
  SANKURU: "桑库鲁",
  "SUD-KIVU": "南基伍",
  "SUD-UBANGI": "南乌班吉",
  TANGANYIKA: "坦噶尼喀",
  TSHOPO: "乔波",
  TSHUAPA: "楚阿帕",
  "COMMUNE DE LIMETE": "利梅特区",
  "COMMUNE DE KASA-VUBU": "卡萨武布区",
  "COMMUNE DE KALAMU": "卡拉穆区",
  "COMMUNE DE KINTAMBO": "金坦博区",
  "COMMUNE DE BANDALUNGWA": "班达隆瓦区",
  "COMMUNE DE KIMBANSEKE": "金班塞凯区",
  "COMMUNE DE MALUKU": "马卢库区",
  "COMMUNE DE MASINA": "马西纳区",
  "COMMUNE DE MONT-NGAFULA": "蒙恩加富拉区",
};

export function localizePriceRegion(region: string) {
  if (!region) return "待补充";
  return region
    .split("/")
    .map((part) => part.trim())
    .map((part) => DRC_REGION_LABELS[part.toUpperCase()] ?? part)
    .join(" / ");
}

export function bilingualTitle(localized: string, original: string) {
  return localized && original && localized !== original
    ? `${localized}（原文：${original}）`
    : localized || original;
}
