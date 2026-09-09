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

const courtPlatforms = [
  { title: "中国执行信息公开网", url: "https://zxgk.court.gov.cn/" },
  { title: "人民法院在线服务", url: "https://ssfw.court.gov.cn/ssfww/" },
  { title: "信用中国", url: "https://www.creditchina.gov.cn/" },
];

const manualJudicialRisk = {
  status: "manual_required" as const,
  summary: "尚未完成官方司法平台逐案实名核验",
  platforms: courtPlatforms,
  note: "公开搜索无结果不等于无司法风险。供应商准入前须使用企业全称和统一社会信用代码，完成人民法院、执行信息及信用平台核验并留存截图。",
};

const honeywellGovernment: DueDiligenceSource = {
  title: "上海市技术先进型服务企业名单",
  url: "https://stcsm.sh.gov.cn/cmsres/b2/b279452cc870447c86d1434a19dc2094/43a9800376c218767cf7892c066176a6.pdf",
  level: "A",
  kind: "government",
};

const honeywellHistorical: DueDiligenceSource = {
  title: "霍尼韦尔综合科技（中国）有限公司历史工商披露",
  url: "https://pdf.dfcfw.com/pdf/H2_AN201803201106827305_1.pdf",
  level: "A",
  kind: "disclosure",
};

const siemensDisclosure: DueDiligenceSource = {
  title: "西门子（中国）有限公司公开主体资料",
  url: "https://kyy.tongji.edu.cn/__local/C/4D/8F/98B338C4447F00FF14C8BA02699_2CE1D6A0_20A3A.pdf?e=.pdf",
  level: "A",
  kind: "government",
};

const inovanceAnnualReport: DueDiligenceSource = {
  title: "汇川技术 2025 年年度报告",
  url: "https://static.cninfo.com.cn/finalpage/2026-04-28/1225208488.PDF",
  level: "A",
  kind: "disclosure",
};

const guonengDisclosure: DueDiligenceSource = {
  title: "国能智深公开工商信息披露",
  url: "https://q.stock.sohu.com/newpdf/202248161561.pdf",
  level: "A",
  kind: "disclosure",
};

const huaweiGovernment: DueDiligenceSource = {
  title: "深圳市企业信用信息公示报告",
  url: "https://qr.szcredit.org.cn/GJQYCredit/GSZJGSPTS/Print.aspx?rid=8B0584DD3C6267A3",
  level: "A",
  kind: "government",
};

const h3cDisclosure: DueDiligenceSource = {
  title: "新华三技术有限公司招股说明书披露",
  url: "https://static.cninfo.com.cn/finalpage/2022-05-13/1213339279.PDF",
  level: "A",
  kind: "disclosure",
};

const h3cCurrentLead: DueDiligenceSource = {
  title: "新华三 2026 年公开公告线索",
  url: "https://notice.10jqka.com.cn/api/pdf/4acbb5300bc6173a.pdf",
  level: "C",
  kind: "industry",
};

const schneiderDisclosure: DueDiligenceSource = {
  title: "施耐德电气（中国）有限公司公开披露",
  url: "https://static.cninfo.com.cn/finalpage/2022-05-25/1213483483.PDF",
  level: "A",
  kind: "disclosure",
};

const cumminsPermit: DueDiligenceSource = {
  title: "康明斯（中国）投资有限公司电信许可公示线索",
  url: "https://www.51miit.com/details/9a6b8cd7d16e4a6e95fb6cddf3ae4e67/",
  level: "C",
  kind: "industry",
};

export const p1SupplierDueDiligence: SupplierDueDiligence[] = [
  {
    supplierId: "SUP-KNG-017",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field(
      "913100006607049944",
      "needs_review",
      honeywellGovernment,
      "该代码对应候选主体霍尼韦尔综合科技（中国）有限公司；Excel 为品牌名称，须核对报价单和合同抬头。",
    ),
    legalRepresentative: field(
      "STEPHEN WAI-LIP SHANG（历史披露）",
      "lead_only",
      honeywellHistorical,
      "2018 年历史信息，不代表当前登记。",
    ),
    registeredCapital: field(
      "2,980 万美元（历史披露）",
      "lead_only",
      honeywellHistorical,
      "需以当前营业执照和国家企业信用信息公示系统为准。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "必须先确认工业自动化产品对应的中国签约主体，不得在不同霍尼韦尔法人之间自动合并资质与诉讼记录。",
      "产品认证需按具体控制器、仪表和安全产品型号索取证书编号。",
    ],
  },
  {
    supplierId: "SUP-KNG-022",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field(
      "91110000625907585K",
      "needs_review",
      siemensDisclosure,
      "代码对应候选主体西门子（中国）有限公司；Excel 名称为西门子股份公司品牌级记录。",
    ),
    legalRepresentative: field(
      "肖松（DR. SONG XIAO）",
      "lead_only",
      siemensDisclosure,
      "需以当前营业执照复核。",
    ),
    registeredCapital: field(
      "90,000 万欧元（公开资料口径）",
      "needs_review",
      siemensDisclosure,
      "公开资料的单位与当前实缴情况需通过营业执照和企业公示系统复核。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "正式询价需确认西门子中国、区域销售公司或授权经销商中的实际签约主体。",
      "PLC、变频器和工业软件的授权证明及原厂售后承诺应分项索取。",
    ],
  },
  {
    supplierId: "SUP-KNG-023",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("914403007488656882", "confirmed", inovanceAnnualReport),
    legalRepresentative: field("朱兴明", "confirmed", inovanceAnnualReport),
    registeredCapital: field(
      "270,699.3804 万元人民币（2025 年末股本口径）",
      "needs_review",
      inovanceAnnualReport,
      "年报股本不等同于当前营业执照注册资本，需在准入时补执照复核。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "上市公司主体信息可信度高，但具体产品认证和软件许可仍需按供货清单索取。",
      "海外现场服务承诺、备件清单和英文资料应纳入技术商务评审。",
    ],
  },
  {
    supplierId: "SUP-KNG-024",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("91110108739373518E", "confirmed", guonengDisclosure),
    legalRepresentative: field(
      "冯健（2022 年披露）",
      "lead_only",
      guonengDisclosure,
      "历史披露，需核对当前营业执照。",
    ),
    registeredCapital: field(
      "20,404.31 万元人民币（当前公开线索）",
      "needs_review",
      guonengDisclosure,
      "2022 年披露为 12,000 万元，公开信息存在时间口径变化，需以当前公示为准。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "控制系统用于水厂前需完成行业适配、接口、冗余和网络安全专项评审。",
      "国家能源集团关联关系不等于对本项目合同承担保证责任。",
    ],
  },
  {
    supplierId: "SUP-KNG-025",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("914403001922038216", "confirmed", huaweiGovernment),
    legalRepresentative: field("赵明路", "confirmed", huaweiGovernment),
    registeredCapital: field("4,114,113.1820 万元人民币", "confirmed", huaweiGovernment),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "主体信息来自深圳市企业信用公示报告，采购时仍需核对具体产品销售和授权主体。",
      "网络、云和数字能源产品需分别核验出口、授权、当地适配及数据合规要求。",
    ],
  },
  {
    supplierId: "SUP-KNG-026",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("91330100754408889H", "confirmed", h3cDisclosure),
    legalRepresentative: field(
      "陈杰（2026 年公告线索）",
      "lead_only",
      h3cCurrentLead,
      "需以当前营业执照复核。",
    ),
    registeredCapital: field(
      "100,000 万元人民币（2026 年公告线索）",
      "needs_review",
      h3cCurrentLead,
      "2022 年披露为 66,198 万元，需核对工商变更登记。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "应索取网络、安全、服务器和存储产品对应的原厂授权及服务承诺。",
      "工业控制网络场景需明确与 PLC/DCS 厂商的接口和网络安全责任边界。",
    ],
  },
  {
    supplierId: "SUP-KNG-030",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field("91110105625910426D", "confirmed", schneiderDisclosure),
    legalRepresentative: field(
      "尹正（2022 年披露）",
      "lead_only",
      schneiderDisclosure,
      "历史披露，需通过当前营业执照复核。",
    ),
    registeredCapital: field(
      "4,450 万美元（2022 年披露）",
      "lead_only",
      schneiderDisclosure,
      "历史披露，不代表当前登记状态。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: [
      "不同产品线可能由不同授权渠道供货，必须核验渠道授权书和原厂质保。",
      "低压配电、控制系统和 UPS 的认证应按具体型号与目的国标准逐项索取。",
    ],
  },
  {
    supplierId: "SUP-KNG-031",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: field(
      "91110000625912157K",
      "needs_review",
      cumminsPermit,
      "代码对应候选主体康明斯（中国）投资有限公司；Excel 为康明斯品牌记录。",
    ),
    legalRepresentative: field(
      "NATHAN R. STONER",
      "lead_only",
      cumminsPermit,
      "来自许可公示线索，需以当前营业执照复核。",
    ),
    registeredCapital: field(
      "12,477 万美元",
      "lead_only",
      cumminsPermit,
      "来自许可公示线索，需核对当前登记和实际供货法人。",
    ),
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "增值电信业务经营许可证",
        number: "合字B2-20250145",
        status: "needs_review",
        note: "仅用于确认公开许可线索，不代表发电机组产品认证或项目供货资质。",
        source: cumminsPermit,
      },
    ],
    reviewNotes: [
      "必须确认发电机组的生产、销售或授权经销主体，不能将投资公司信息自动视为设备制造主体资质。",
      "发电机组认证、排放、噪声及目的国准入资料需按型号单独索取。",
    ],
  },
];

export const p1SupplierDueDiligenceById = Object.fromEntries(
  p1SupplierDueDiligence.map((item) => [item.supplierId, item]),
) as Record<string, SupplierDueDiligence>;
