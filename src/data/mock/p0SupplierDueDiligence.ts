export type DueDiligenceStatus =
  | "confirmed"
  | "lead_only"
  | "needs_review"
  | "not_found";

export type DueDiligenceSource = {
  title: string;
  url: string;
  level: "A" | "B" | "C";
  kind: "government" | "disclosure" | "official" | "industry";
};

export type VerifiedBusinessField = {
  value: string;
  status: DueDiligenceStatus;
  note?: string;
  source?: DueDiligenceSource;
};

export type SupplierCertificateRecord = {
  name: string;
  number: string;
  status: "valid" | "historical" | "expired" | "needs_review";
  validUntil?: string;
  note?: string;
  source: DueDiligenceSource;
};

export type SupplierDueDiligence = {
  supplierId: string;
  checkedAt: string;
  unifiedSocialCreditCode: VerifiedBusinessField;
  legalRepresentative: VerifiedBusinessField;
  registeredCapital: VerifiedBusinessField;
  judicialRisk: {
    status: "manual_required" | "risk_found" | "checked_no_public_hit";
    summary: string;
    platforms: { title: string; url: string }[];
    note: string;
  };
  certificates: SupplierCertificateRecord[];
  reviewNotes: string[];
};

const needsManual = (note: string): VerifiedBusinessField => ({
  value: "待官方平台核验",
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
  note: "公开搜索无结果不等于无司法风险。正式准入前应以企业全称和统一社会信用代码，在执行信息、裁判文书及信用公示平台完成验证码查询并留存截图。",
};

const shanghaiKsbCode: DueDiligenceSource = {
  title: "上海市高新技术企业认定名单",
  url: "https://stcsm.sh.gov.cn/cmsres/c1/c1062ba5a515409d84da176e36545197/20998c18af18bdc03600db4f3bce519d.pdf",
  level: "A",
  kind: "government",
};

const shanghaiKaiquanCode: DueDiligenceSource = {
  title: "上海市高新技术企业认定名单",
  url: "https://stcsm.sh.gov.cn/cmsres/6e/6e0deccbfb0144bd9ea697e9346ee99b/102193719438bd6a7d89b894457b7e80.pdf",
  level: "A",
  kind: "government",
};

const kaiquanNuclearLicense: DueDiligenceSource = {
  title: "生态环境部民用核安全设备许可证",
  url: "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk09/202206/W020220627519259918314.pdf",
  level: "A",
  kind: "government",
};

const hachLicense: DueDiligenceSource = {
  title: "上海长宁政府公开的哈希营业执照",
  url: "https://static.shcn.gov.cn/cncms/2023/0421/76c985b5-b495-4666-9c45-194ee7197558.pdf",
  level: "A",
  kind: "government",
};

const jingjinDisclosure: DueDiligenceSource = {
  title: "景津装备完成工商变更登记公告",
  url: "https://static.cninfo.com.cn/finalpage/2026-01-08/1224922651.PDF",
  level: "A",
  kind: "disclosure",
};

const xinxingDisclosure: DueDiligenceSource = {
  title: "新兴铸管 2025 年半年度报告",
  url: "https://static.cninfo.com.cn/finalpage/2025-08-26/1224572468.pdf",
  level: "A",
  kind: "disclosure",
};

export const p0SupplierDueDiligence: SupplierDueDiligence[] = [
  {
    supplierId: "SUP-KNG-001",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: { value: "91310000607272395Y", status: "confirmed", source: shanghaiKsbCode },
    legalRepresentative: {
      value: "Ralf Kannefass",
      status: "lead_only",
      note: "来自公开企业信息线索，需以国家企业信用信息公示系统当前登记为准。",
      source: {
        title: "上海凯士比泵企业公开信息",
        url: "https://big5.chinabgao.com/enterprise/detail/22536037d04a44d688d1ca3140e1525f.html",
        level: "C",
        kind: "industry",
      },
    },
    registeredCapital: {
      value: "2,700 万美元",
      status: "lead_only",
      note: "历史上市公司披露口径，当前注册资本需重新核验。",
      source: {
        title: "上海电气历史公开披露",
        url: "https://epaper.stcn.com/paper/zqsb/page/1/2013-02/25/C009/20130225C009_pdf.pdf",
        level: "A",
        kind: "disclosure",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["法定代表人与注册资本尚未取得当前工商登记原件。", "正式询价前索取最新营业执照和体系证书扫描件。"],
  },
  {
    supplierId: "SUP-KNG-002",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: { value: "91310000630452482T", status: "confirmed", source: shanghaiKaiquanCode },
    legalRepresentative: { value: "林凯文", status: "confirmed", source: kaiquanNuclearLicense },
    registeredCapital: {
      value: "30,000 万元人民币",
      status: "lead_only",
      note: "来自公开交易文件中的工商信息，仍应与当前营业执照核对。",
      source: {
        title: "公开交易文件中的凯泉工商信息",
        url: "https://pdf.dfcfw.com/pdf/H2_AN202104261487969624_1.pdf?1620747188000.pdf=",
        level: "C",
        kind: "disclosure",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "民用核安全设备设计许可证",
        number: "国核安证字S（22）13号",
        status: "valid",
        validUntil: "2027-06-30",
        source: kaiquanNuclearLicense,
      },
      {
        name: "排污许可证",
        number: "91310000630452482T001Q",
        status: "valid",
        validUntil: "2031-01-13",
        source: {
          title: "全国排污许可证管理信息平台",
          url: "https://permit.mee.gov.cn/perxxgkinfo/syssb/wysb/hpsp/hpsp-company-sewage%21showImage.action?dataid=c9812d48548649a6830c7cc75e288a9a",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["注册资本需以当前营业执照复核。", "核安全许可证仅证明许可范围内能力，不替代本项目产品选型和质量验收。"],
  },
  {
    supplierId: "SUP-KNG-003",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: {
      value: "91330382734536859Q",
      status: "confirmed",
      source: {
        title: "浙江省 AAA 级守合同重信用公示名单",
        url: "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web3096/site/attach/0/f3cc882275dc474eb00841922daa6599.pdf",
        level: "A",
        kind: "government",
      },
    },
    legalRepresentative: needsManual("未取得可交叉核验的当前法定代表人信息。"),
    registeredCapital: {
      value: "12,588 万元人民币",
      status: "lead_only",
      note: "来自行业企业库线索，需以营业执照确认。",
      source: {
        title: "建筑行业企业信息",
        url: "https://company.cbi360.net/2846264/",
        level: "C",
        kind: "industry",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "高新技术企业证书",
        number: "GR202433002690",
        status: "valid",
        note: "证书有效期仍需在认定机构平台复核。",
        source: {
          title: "浙江省 2024 年高新技术企业备案名单",
          url: "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web3722/site/attach/0/d992f7a645ed4769998c6727e6355076.pdf",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["法定代表人待营业执照核验。", "体系认证宣传不能替代可查询的证书编号。"],
  },
  {
    supplierId: "SUP-KNG-004",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: needsManual("未在本轮官方公示材料中取得统一社会信用代码。"),
    legalRepresentative: needsManual("未取得可核验法定代表人。"),
    registeredCapital: {
      value: "3,288 万元人民币",
      status: "lead_only",
      note: "仅为行业平台线索，不作为供应商准入依据。",
      source: {
        title: "山东艾克行业展示页",
        url: "https://sunmeng199301.gys.cn/",
        level: "C",
        kind: "industry",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["主体信息不足，暂不建议进入正式询价。", "需提供营业执照、授权联系人和有效体系证书。"],
  },
  {
    supplierId: "SUP-KNG-005",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: { value: "91310115593171357J", status: "confirmed", source: hachLicense },
    legalRepresentative: { value: "秦晓培", status: "confirmed", source: hachLicense },
    registeredCapital: { value: "100 万美元", status: "confirmed", source: hachLicense },
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "营业执照证照编号",
        number: "41000002202112290007",
        status: "historical",
        note: "公开材料中的 2021 年营业执照证照编号，采购前需索取最新版。",
        source: hachLicense,
      },
      {
        name: "放射性装置豁免备案文件",
        number: "沪环保辐〔2016〕450号",
        status: "historical",
        source: {
          title: "生态环境部豁免备案公告",
          url: "https://www.mee.gov.cn/gkml/hbb/bgg/201706/t20170615_416099.htm",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["营业执照公开材料时间为 2021 年，需索取当前版本。", "豁免备案仅适用于公告列明的设备型号。"],
  },
  {
    supplierId: "SUP-KNG-008",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: { value: "9137140056770173X4", status: "confirmed", source: jingjinDisclosure },
    legalRepresentative: { value: "姜桂廷", status: "confirmed", source: jingjinDisclosure },
    registeredCapital: { value: "57,637.30 万元人民币", status: "confirmed", source: jingjinDisclosure },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["上市公司披露可确认工商主体，司法风险仍须按项目准入流程查询。", "特种设备许可需按拟采购设备类别另行核对。"],
  },
  {
    supplierId: "SUP-KNG-009",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: {
      value: "91320115MA1MPFJU23",
      status: "confirmed",
      source: {
        title: "南京市建筑业企业信用评价结果",
        url: "https://sjw.nanjing.gov.cn/tzgg/202508/P020250822601023750349.pdf",
        level: "A",
        kind: "government",
      },
    },
    legalRepresentative: needsManual("未取得当前法定代表人官方材料。"),
    registeredCapital: {
      value: "5,000 万元人民币",
      status: "lead_only",
      note: "来自行业展示页，需以营业执照核验。",
      source: {
        title: "江苏达泽企业介绍",
        url: "https://product.epday.com/com/dazehuanbao/introduce/",
        level: "C",
        kind: "industry",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["法定代表人、注册资本和高新技术证书编号仍需补证。"],
  },
  {
    supplierId: "SUP-KNG-012",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: needsManual("官网已确认品牌和运营主体名称，但未取得官方登记代码。"),
    legalRepresentative: needsManual("未取得可核验法定代表人。"),
    registeredCapital: {
      value: "500 万元人民币",
      status: "lead_only",
      note: "仅为公开行业文章线索，不能作为正式工商依据。",
      source: {
        title: "广州千叶公开行业线索",
        url: "https://www.cnblogs.com/deepagents/p/20294250",
        level: "C",
        kind: "industry",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["需确认合同主体是广州千叶水设备有限公司还是旗下品牌/子公司。", "高新技术企业宣传指向旗下广东爱克，不能直接归属于广州千叶主体。"],
  },
  {
    supplierId: "SUP-KNG-013",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: needsManual("仅找到行业展示页，未取得官方登记信息。"),
    legalRepresentative: needsManual("未取得可核验法定代表人。"),
    registeredCapital: needsManual("未取得可核验注册资本。"),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["联系人戴仁德仅为行业展示联系人，不等同于法定代表人。", "主体、证照和经营状态均需人工核验。"],
  },
  {
    supplierId: "SUP-KNG-014",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: needsManual("存在近似企业名称，尚未完成准确主体匹配。"),
    legalRepresentative: needsManual("准确主体未确认。"),
    registeredCapital: needsManual("准确主体未确认。"),
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["禁止与名称近似企业自动合并。", "当前不建议进入正式供应商短名单。"],
  },
  {
    supplierId: "SUP-KNG-016",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: {
      value: "913707007807807643",
      status: "lead_only",
      note: "来自行业企业库线索，需与营业执照原件交叉核验。",
      source: {
        title: "山东龙安泰企业信息线索",
        url: "https://m.china-mcc.com/corporation_show-608894.html",
        level: "C",
        kind: "industry",
      },
    },
    legalRepresentative: {
      value: "代春龙",
      status: "lead_only",
      note: "来自行业企业库线索。",
      source: {
        title: "山东龙安泰企业信息线索",
        url: "https://m.china-mcc.com/corporation_show-608894.html",
        level: "C",
        kind: "industry",
      },
    },
    registeredCapital: {
      value: "3,000 万元人民币",
      status: "lead_only",
      note: "来自行业企业库线索。",
      source: {
        title: "山东龙安泰企业信息线索",
        url: "https://m.china-mcc.com/corporation_show-608894.html",
        level: "C",
        kind: "industry",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "高新技术企业证书",
        number: "GR202537002393",
        status: "valid",
        source: {
          title: "山东省 2025 年高新技术企业名单",
          url: "https://kjt.shandong.gov.cn/module/download/downfile.jsp?classid=0&filename=e3338fbf3c8d4981885adf32f7cd48b8.pdf",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["工商三要素当前仅为线索级，必须补营业执照。", "其优势偏工业废水，饮用水项目适用性需技术复核。"],
  },
  {
    supplierId: "SUP-KNG-019",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: {
      value: "91330100MA27YTKRXE / 91330000143853115H",
      status: "needs_review",
      note: "政府公开材料出现两个代码，可能对应新旧经营主体或历史更名，必须先确认本次合同签约主体。",
      source: {
        title: "余杭区工业企业综合评价名单",
        url: "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web3095/site/attach/0/0f4330d92eac4555becad1ab12e5dd43.pdf",
        level: "A",
        kind: "government",
      },
    },
    legalRepresentative: needsManual("存在新旧主体代码冲突，暂不自动归并法定代表人。"),
    registeredCapital: needsManual("需在确认合同主体后查询。"),
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "高新技术企业证书",
        number: "GR202133001044",
        status: "expired",
        note: "2021 年证书记录，仅作为历史线索；需查询后续重新认定信息及对应主体代码。",
        source: {
          title: "浙江省 2021 年高新技术企业备案名单",
          url: "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web3676/site/attach/0/e14bd64ac767438f8613234ebb7ccc68.pdf",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["必须先锁定本次报价和合同盖章主体。", "不得把原上市主体与现运营主体的资质、诉讼和业绩自动合并。"],
  },
  {
    supplierId: "SUP-KNG-020",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: needsManual("官方科技型中小企业名单确认了企业存在，但未展示信用代码。"),
    legalRepresentative: needsManual("未取得可核验法定代表人。"),
    registeredCapital: needsManual("未取得可核验注册资本。"),
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "科技型中小企业入库登记编号",
        number: "2024341181A8020396",
        status: "historical",
        note: "该编号为 2024 年科技型中小企业入库登记编号，不等同于质量体系证书。",
        source: {
          title: "安徽省 2024 年科技型中小企业名单",
          url: "https://www.chinatorch.gov.cn/zxqyfw/c101154/202409/5d41b492352c495f93a206dac341f039/files/1c6ac22f6f354d9b8661f7a23a980c12.pdf",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["工商三要素和体系证书仍需供应商提供。"],
  },
  {
    supplierId: "SUP-KNG-021",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: { value: "91130400104365768G", status: "confirmed", source: xinxingDisclosure },
    legalRepresentative: { value: "何齐书", status: "confirmed", source: xinxingDisclosure },
    registeredCapital: { value: "3,963,182,285 元人民币", status: "confirmed", source: xinxingDisclosure },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["上市公司披露可确认工商主体，具体产品卫生许可、涂层和压力等级证书需按型号索取。"],
  },
  {
    supplierId: "SUP-KNG-027",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: needsManual("未取得可核验统一社会信用代码。"),
    legalRepresentative: {
      value: "金延东",
      status: "lead_only",
      note: "来自媒体转述的第三方企业信息。",
      source: {
        title: "山东水龙王公开风险线索",
        url: "https://finance.sina.cn/2026-04-27/detail-inhvxpif2368957.d.html",
        level: "C",
        kind: "industry",
      },
    },
    registeredCapital: {
      value: "5,018 万元人民币",
      status: "lead_only",
      note: "来自媒体转述的第三方企业信息。",
      source: {
        title: "山东水龙王公开风险线索",
        url: "https://finance.sina.cn/2026-04-27/detail-inhvxpif2368957.d.html",
        level: "C",
        kind: "industry",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [],
    reviewNotes: ["原备案网站存在空壳网站清理线索，应重点核验当前经营、人员和产能。", "法定代表人与注册资本尚未达到官方确认级别。"],
  },
  {
    supplierId: "SUP-KNG-028",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: {
      value: "91310000703010619L",
      status: "confirmed",
      source: {
        title: "上海市高新技术企业认定名单",
        url: "https://stcsm.sh.gov.cn/cmsres/c1/c1062ba5a515409d84da176e36545197/20998c18af18bdc03600db4f3bce519d.pdf",
        level: "A",
        kind: "government",
      },
    },
    legalRepresentative: needsManual("未取得可核验当前法定代表人。"),
    registeredCapital: needsManual("未取得可核验当前注册资本。"),
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "高新技术企业证书",
        number: "GR201731001168",
        status: "expired",
        note: "2017 年历史证书编号，不能证明当前仍在有效期。",
        source: {
          title: "上海市 2017 年高新技术企业名单",
          url: "https://stcsm.sh.gov.cn/cmsres/1b/1bfa5c059a95468d88f64e6b47e1d790/36664caaf6d3584ef48caced4e279920.pdf",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["需确认本次采购应由研磨分散业务还是泵业务主体承接。", "历史高新证书已过期，当前资质需重新核验。"],
  },
  {
    supplierId: "SUP-KNG-029",
    checkedAt: "2026-07-23",
    unifiedSocialCreditCode: {
      value: "91310115607373946M",
      status: "confirmed",
      source: {
        title: "公共资源交易企业主体信息",
        url: "https://gcjs.ggzyjy.weihai.cn/wz/PortalQDManage/ShareResources/CorpInfo?corpGuid=2e18d8d8-8440-4b5e-acca-91ac5d858726",
        level: "A",
        kind: "government",
      },
    },
    legalRepresentative: {
      value: "JOHN PETER MARKMANN",
      status: "lead_only",
      note: "来自企业登记信息聚合线索，需以最新营业执照确认。",
      source: {
        title: "格兰富企业登记线索",
        url: "https://www.cnverify.com/company/Grundfos-Pumps-Shanghai-Co-Ltd",
        level: "C",
        kind: "industry",
      },
    },
    registeredCapital: {
      value: "3,300 万元（平台口径）/ 500 万美元（登记线索）",
      status: "needs_review",
      note: "两个公开来源币种口径不同，采购前必须以营业执照原件确认。",
      source: {
        title: "公共资源交易企业主体信息",
        url: "https://gcjs.ggzyjy.weihai.cn/wz/PortalQDManage/ShareResources/CorpInfo?corpGuid=2e18d8d8-8440-4b5e-acca-91ac5d858726",
        level: "A",
        kind: "government",
      },
    },
    judicialRisk: manualJudicialRisk,
    certificates: [
      {
        name: "浙江省水利新技术推广证书（一体化泵闸）",
        number: "ZST2019023",
        status: "expired",
        validUntil: "2022-08-22",
        source: {
          title: "浙江省水利新技术推广证书信息",
          url: "https://slt.zj.gov.cn/module/download/downfile.jsp?classid=0&filename=0106a256ead54458907e5cc4913e7b6b.pdf",
          level: "A",
          kind: "government",
        },
      },
      {
        name: "浙江省水利新技术推广证书（一体化预制泵站）",
        number: "ZST2019024",
        status: "expired",
        validUntil: "2022-08-22",
        source: {
          title: "浙江省水利新技术推广证书信息",
          url: "https://slt.zj.gov.cn/module/download/downfile.jsp?classid=0&filename=0106a256ead54458907e5cc4913e7b6b.pdf",
          level: "A",
          kind: "government",
        },
      },
    ],
    reviewNotes: ["法定代表人需营业执照确认。", "两项水利推广证书均为历史已到期记录，不能作为当前有效资质。"],
  },
];

export const p0SupplierDueDiligenceById = Object.fromEntries(
  p0SupplierDueDiligence.map((item) => [item.supplierId, item]),
) as Record<string, SupplierDueDiligence>;
