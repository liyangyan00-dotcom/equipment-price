import type {
  DueDiligenceSource,
  SupplierDueDiligence,
  VerifiedBusinessField,
} from "./p0SupplierDueDiligence";

const field = (
  value: string,
  status: VerifiedBusinessField["status"],
  source?: DueDiligenceSource,
  note?: string,
): VerifiedBusinessField => ({ value, status, source, note });

const notApplicable = (note: string): VerifiedBusinessField => ({
  value: "不适用",
  status: "not_found",
  note,
});

const courtPlatforms = [
  { title: "中国执行信息公开网", url: "https://zxgk.court.gov.cn/" },
  { title: "人民法院在线服务", url: "https://ssfw.court.gov.cn/ssfww/" },
  { title: "信用中国", url: "https://www.creditchina.gov.cn/" },
];

const manualJudicialRisk = {
  status: "manual_required" as const,
  summary: "尚未完成官方司法平台逐案实名核验",
  platforms: courtPlatforms,
  note: "公开搜索无结果不等于无司法风险。正式准入前应使用企业全称和统一社会信用代码，在人民法院、执行信息及信用平台完成核验并留存证据。",
};

const channelRisk = {
  status: "manual_required" as const,
  summary: "该记录不是企业法人，无法直接执行司法风险核验",
  platforms: courtPlatforms,
  note: "须先拆分并登记具体本地供应商，再按每个企业或个体经营者的注册名称和登记号码完成核验。",
};

const thermoCertificate: DueDiligenceSource = {
  title: "赛默飞世尔科技（中国）有限公司 ISO 9001 证书",
  url: "https://documents.thermofisher.com/TFS-Assets/BID/certificate/Certificate-of-Quality/ISO-Certs/cert-iso-9001-sgs-CN2300004211-shanghai-ch.pdf",
  level: "B",
  kind: "official",
};

const thermoDisclosure: DueDiligenceSource = {
  title: "上市申请文件披露的赛默飞供应商信息",
  url: "https://static.sse.com.cn/stock/disclosure/announcement/c/202209/001184_20220929_FBY6.pdf",
  level: "A",
  kind: "disclosure",
};

const angelGovernment: DueDiligenceSource = {
  title: "深圳光明区优质企业名单",
  url: "https://www.szgm.gov.cn/gmjjfw/attachment/1/1651/1651236/12504938.pdf",
  level: "A",
  kind: "government",
};

const angelLicense: DueDiligenceSource = {
  title: "信用中国（广东中山）行政许可公示",
  url: "https://credit.zs.gov.cn/txzxkxzcf/txzxkxzcfAction/getPublicDetailInfo?jsonParam=+%7B%22tid%22%3A%2257e7f41f5c5546a19d62390de90fe3a0%22%2C%22xztype%22%3A%221%22+%7D",
  level: "A",
  kind: "government",
};

const atlasLead: DueDiligenceSource = {
  title: "阿特拉斯·科普柯（上海）贸易有限公司公开认证线索",
  url: "https://www.waiqicha.com/ds/zhengshu_1180716014955196148_6452.html",
  level: "C",
  kind: "industry",
};

const ingersollLead: DueDiligenceSource = {
  title: "上海英格索兰压缩机有限公司公开工商线索",
  url: "https://www.windzx.com/1006018978.html",
  level: "C",
  kind: "industry",
};

const boschDisclosure: DueDiligenceSource = {
  title: "上市公司公告披露的博世中国主体信息",
  url: "https://static.cninfo.com.cn/finalpage/2021-09-10/1210994111.PDF",
  level: "A",
  kind: "disclosure",
};

const shimadzuGovernment: DueDiligenceSource = {
  title: "贵州省疾控中心政府采购成交公告",
  url: "https://www.gzscdc.org.cn/xxgk/zbcg/content_9587",
  level: "A",
  kind: "government",
};

const shimadzuLead: DueDiligenceSource = {
  title: "岛津企业管理（中国）有限公司公开工商线索",
  url: "https://m.zhipin.com/companys/c0d538f12463fdb31Hd93dm7.html",
  level: "C",
  kind: "industry",
};

const agilentOfficial: DueDiligenceSource = {
  title: "安捷伦中国供应商信息表",
  url: "https://www.agilent.com/cs/library/datasheets/public/04CN_Fact_Sheet_China_RMB_Chinese_English.pdf",
  level: "B",
  kind: "official",
};

const agilentGovernment: DueDiligenceSource = {
  title: "国家外汇管理局中关村中心支局企业名录",
  url: "https://www.safe.gov.cn/beijing/file/file/20210817/7bd7feb50403499380ea75419298275b.pdf?n=%E4%B8%AD%E5%85%B3%E6%9D%91%E4%B8%AD%E5%BF%83%E6%94%AF%E5%B1%80%E8%BE%96%E5%86%85%E4%BC%81%E4%B8%9A%E5%90%8D%E5%BD%95%EF%BC%88%E6%88%AA%E8%87%B32021%E5%B9%B47%E6%9C%88%EF%BC%89",
  level: "A",
  kind: "government",
};

export const p2SupplierDueDiligence: SupplierDueDiligence[] = [
  {
    supplierId: "SUP-KNG-006",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("91310115753164501J", "confirmed", thermoCertificate),
    legalRepresentative: field(
      "FAUSTINO MIGUEL ANTONIO（当前公开线索）",
      "needs_review",
      thermoCertificate,
      "2022 年披露为 PANG SZE HANN，信息存在时间变化，须以当前营业执照复核。",
    ),
    registeredCapital: field(
      "800 万美元",
      "needs_review",
      thermoDisclosure,
      "来自历史公开披露，需核对当前工商登记。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "ISO 9001 质量管理体系认证",
        number: "CN23/00004211",
        status: "needs_review",
        note: "官方证书可确认主体和证书编号，正式采购前仍需核验当前有效期及供货产品覆盖范围。",
        source: thermoCertificate,
      },
    ],
    reviewNotes: [
      "进口实验室设备应逐项核验产品注册、校准溯源、售后工程师和备件保障。",
      "高端分析设备必须与检测方法、实验室环境和操作人员能力匹配。",
    ],
  },
  {
    supplierId: "SUP-KNG-007",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("914403001922072325", "confirmed", angelGovernment),
    legalRepresentative: field("孔那", "confirmed", angelLicense),
    registeredCapital: field(
      "6,000 万元人民币",
      "lead_only",
      angelLicense,
      "公开行业资料口径，需以当前营业执照复核。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "行政许可仅能证明对应型号或事项，不等于整个工程净水产品线均满足本项目标准。",
      "大型水厂适用性、产水规模、膜系统设计和目的国认证需专项评审。",
    ],
  },
  {
    supplierId: "SUP-KNG-010",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field(
      "913101156074020229",
      "needs_review",
      atlasLead,
      "当前仅取得第三方认证公示线索，需以营业执照原件复核。",
    ),
    legalRepresentative: field(
      "龚元相",
      "lead_only",
      atlasLead,
      "第三方工商线索，需核对当前登记。",
    ),
    registeredCapital: field(
      "2,305 万美元（公开线索）",
      "needs_review",
      atlasLead,
      "公开披露中出现 1,305 万美元和 2,305 万美元不同口径，须以当前营业执照为准。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "ISO 9001 质量管理体系历史认证",
        number: "ANT02146.1.CC31",
        status: "expired",
        validUntil: "2020-01-01",
        note: "仅作为历史线索，不得视为当前有效证书。",
        source: atlasLead,
      },
    ],
    reviewNotes: [
      "官网当前客户中心地址与注册信息可能不同，合同、开票、发货和售后主体需一致。",
      "气浮或仪表风系统需提供选型计算、能效、噪声和冗余方案。",
    ],
  },
  {
    supplierId: "SUP-KNG-011",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field(
      "91310000607211939H（候选主体）",
      "needs_review",
      ingersollLead,
      "对应上海英格索兰压缩机有限公司；Excel 为品牌名称，需确认实际签约主体。",
    ),
    legalRepresentative: field(
      "李毅（候选主体公开线索）",
      "lead_only",
      ingersollLead,
      "需以当前营业执照及本次报价主体复核。",
    ),
    registeredCapital: field(
      "765 万元人民币（候选主体公开线索）",
      "lead_only",
      ingersollLead,
      "不得与英格索兰机械（上海）有限公司等其他法人自动合并。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "必须先锁定压缩机、泵、起重或工具产品线对应的签约与制造主体。",
      "不同英格索兰在华法人之间的资质、案件、授权和业绩不得自动归并。",
    ],
  },
  {
    supplierId: "SUP-KNG-015",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: notApplicable("该记录为本地采购渠道，尚未拆分为具体供应商。"),
    legalRepresentative: notApplicable("无明确企业主体。"),
    registeredCapital: notApplicable("无明确企业主体。"),
    judicialRisk: channelRisk,
    certificates: [],
    reviewNotes: [
      "禁止以“本地采购”作为合同相对方或付款对象。",
      "应建立本地供应商子名册，并至少采集注册证书、税号、银行账户、联系人、报价单和交付证据。",
    ],
  },
  {
    supplierId: "SUP-KNG-018",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("913100007109203974", "confirmed", boschDisclosure),
    legalRepresentative: field(
      "XU DAQUAN（当前公开线索）",
      "needs_review",
      boschDisclosure,
      "历史披露为 YUDONG CHEN，需以当前营业执照复核。",
    ),
    registeredCapital: field("16,717.3722 万美元", "confirmed", boschDisclosure),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "博世（中国）投资有限公司可能不是最终产品制造主体，需按产品线核验实际供货法人。",
      "安防、控制、工具或楼宇设备应分别索取授权、认证、原厂质保和目的国准入资料。",
    ],
  },
  {
    supplierId: "SUP-KNG-032",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("91310000607408256J", "confirmed", shimadzuGovernment),
    legalRepresentative: field(
      "青山功基 / 马濑嘉昭（公开信息存在差异）",
      "needs_review",
      shimadzuLead,
      "不同时间公开资料显示不同法定代表人，必须以当前营业执照为准。",
    ),
    registeredCapital: field(
      "800 万美元",
      "lead_only",
      shimadzuLead,
      "第三方工商线索，需通过营业执照复核。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "岛津仪器（苏州）有限公司的体系认证不能自动归属于岛津企业管理（中国）有限公司。",
      "按具体仪器型号索取校准、计量、方法验证、维修和耗材保障文件。",
    ],
  },
  {
    supplierId: "SUP-KNG-033",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("911101056876019446", "confirmed", agilentOfficial),
    legalRepresentative: field(
      "杨挺 / 孙大鹏（公开信息存在差异）",
      "needs_review",
      agilentGovernment,
      "不同时间来源存在法定代表人差异，需以当前营业执照复核。",
    ),
    registeredCapital: field(
      "1,000 万美元",
      "lead_only",
      agilentOfficial,
      "官方供应商资料未展示注册资本，金额来自公开工商线索，需营业执照确认。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "官方供应商资料可确认中国销售主体、税号和收款信息，采购时仍应索取最新盖章版本。",
      "水质分析设备应按检测项目、方法标准、检出限和实验室条件完成技术选型。",
    ],
  },
];

export const p2SupplierDueDiligenceById = Object.fromEntries(
  p2SupplierDueDiligence.map((item) => [item.supplierId, item]),
) as Record<string, SupplierDueDiligence>;
