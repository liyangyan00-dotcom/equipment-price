type JsonObject = Record<string, unknown>;

export type ReportDataLink = {
  label: string;
  href: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  interpretation: string;
};

export type ReportAction = {
  action: string;
  owner: string;
  timing: string;
  priority: "P0" | "P1" | "P2";
};

export type StructuredReportChapter = {
  title: string;
  leadershipQuestion: string;
  summary: string;
  findings: string[];
  evidenceRefs: string[];
  metrics: ReportMetric[];
  decisionFocus: string[];
  actions: ReportAction[];
  dataLinks: ReportDataLink[];
};

type MetricKey =
  | "priceTotal"
  | "updates"
  | "suppliers"
  | "aiTasks"
  | "highRisk"
  | "gaps"
  | "confidence"
  | "equipmentTrend"
  | "materialTrend"
  | "inquiryTrend"
  | "supplierResponse"
  | "equipmentGap"
  | "materialGap"
  | "leadGap"
  | "evidenceGap";

export type ReportChapterSpec = {
  title: string;
  leadershipQuestion: string;
  purpose: string;
  metricKeys: MetricKey[];
  decisionFocus: string[];
  actions: ReportAction[];
  dataLinks: ReportDataLink[];
};

export type ReportTemplateSpec = {
  title: string;
  version: string;
  executivePurpose: string;
  chapters: ReportChapterSpec[];
};

const links = {
  project: { label: "项目套价", href: "/project-pricing" },
  equipment: { label: "设备价格库", href: "/equipment-prices" },
  material: { label: "地材价格库", href: "/material-prices" },
  suppliers: { label: "供应商库", href: "/suppliers" },
  inquiries: { label: "询价管理", href: "/inquiries" },
  leads: { label: "价格线索池", href: "/price-leads" },
  evidence: { label: "附件证据库", href: "/attachments" },
  analytics: { label: "统计分析", href: "/analytics" },
  collection: { label: "AI价格采集", href: "/ai-price-collection" },
  workbench: { label: "AI工作台", href: "/ai-workbench" },
};

const action = (
  actionText: string,
  owner: string,
  timing: string,
  priority: "P0" | "P1" | "P2" = "P1",
): ReportAction => ({ action: actionText, owner, timing, priority });

const chapter = (
  title: string,
  leadershipQuestion: string,
  purpose: string,
  metricKeys: MetricKey[],
  decisionFocus: string[],
  actions: ReportAction[],
  dataLinks: ReportDataLink[],
): ReportChapterSpec => ({
  title,
  leadershipQuestion,
  purpose,
  metricKeys,
  decisionFocus,
  actions,
  dataLinks,
});

export const reportTemplateSpecs: ReportTemplateSpec[] = [
  {
    title: "项目成本分析报告",
    version: "2.0",
    executivePurpose:
      "回答项目概算是否可锁定、成本缺口在哪里、需要何种管理动作。",
    chapters: [
      chapter(
        "项目概况",
        "当前项目范围、计价基础和数据成熟度是否足以支持预算决策？",
        "说明项目、统计周期、价格数据覆盖和报告口径，明确本次结论的适用边界。",
        ["priceTotal", "updates", "confidence", "gaps"],
        [
          "是否具备锁定阶段预算的基础",
          "是否需要延长数据补齐周期",
          "本报告可用于概算、预算还是采购控制",
        ],
        [
          action(
            "确认项目范围、币种及价格条款",
            "项目经理",
            "报告审批前",
            "P0",
          ),
          action("冻结本次分析的数据截止时间", "成本负责人", "本期内"),
        ],
        [links.project, links.analytics],
      ),
      chapter(
        "成本构成",
        "设备、地材及待询价项目对总成本的影响是否透明？",
        "从设备、地材、供应商和缺口维度解释成本结构，识别成本集中项与未定价项。",
        ["priceTotal", "suppliers", "equipmentGap", "materialGap"],
        [
          "成本是否过度集中于少数设备或材料",
          "未定价项目是否影响总投资判断",
          "设备与地材数据口径是否一致",
        ],
        [
          action(
            "对高金额和无匹配 BOQ 项逐项复核",
            "造价工程师",
            "3个工作日",
            "P0",
          ),
          action("补齐设备与地材分类映射", "数据管理员", "本周"),
        ],
        [links.project, links.equipment, links.material],
      ),
      chapter(
        "预算偏差",
        "当前价格基础与既有预算之间存在多大偏差，偏差原因能否解释？",
        "聚焦新增价格、价格缺口和可信度变化，区分市场变化、范围变化与数据质量问题。",
        ["updates", "gaps", "confidence", "highRisk"],
        [
          "偏差是否突破项目授权阈值",
          "偏差来自市场还是工程量变化",
          "是否需要调整预备费或重新报批",
        ],
        [
          action("对超阈值偏差形成逐项解释", "成本负责人", "报批前", "P0"),
          action("将无法解释的偏差转入专项询价", "采购负责人", "48小时"),
        ],
        [links.project, links.inquiries, links.leads],
      ),
      chapter(
        "价格趋势",
        "关键设备与地材价格是在上行、下行还是高位波动？",
        "比较当前周期与前一周期的设备、地材和询价变化，判断预算时点风险。",
        ["equipmentTrend", "materialTrend", "inquiryTrend", "updates"],
        [
          "是否需要提前锁价",
          "是否具备等待价格回落的条件",
          "趋势是否由有效样本支撑",
        ],
        [
          action("对持续上行品类制定锁价清单", "采购负责人", "本周", "P0"),
          action("对异常波动记录核验来源月份", "价格管理员", "2个工作日"),
        ],
        [links.analytics, links.equipment, links.material],
      ),
      chapter(
        "成本风险",
        "哪些成本结论可能导致超预算、误判或后续索赔？",
        "汇总高风险价格、低可信数据、证据缺口和供应风险，明确风险暴露面。",
        ["highRisk", "gaps", "evidenceGap", "confidence"],
        [
          "高风险记录是否影响关键路径",
          "缺失证据是否影响审计与索赔",
          "是否需要设置风险准备金",
        ],
        [
          action("高风险记录逐条完成人工复核", "商务经理", "审批前", "P0"),
          action("建立成本风险关闭台账", "项目控制经理", "本期内"),
        ],
        [links.leads, links.evidence, links.analytics],
      ),
      chapter(
        "控制建议",
        "管理层需要批准哪些控制动作，谁负责、何时关闭？",
        "将成本发现转化为锁价、询价、补证、复核和预算调整等可执行事项。",
        ["gaps", "highRisk", "supplierResponse", "confidence"],
        [
          "是否批准重点品类锁价",
          "是否启动补充询价",
          "是否调整预算基线与风险准备",
        ],
        [
          action("批准高风险及高金额项目专项复核", "项目领导", "立即", "P0"),
          action("每周跟踪询价与证据缺口关闭率", "商务经理", "每周"),
        ],
        [links.project, links.inquiries, links.analytics],
      ),
    ],
  },
  {
    title: "设备价格对比报告",
    version: "2.0",
    executivePurpose:
      "回答同口径设备报价是否可比、推荐供应商是否具备商务与履约优势。",
    chapters: [
      chapter(
        "对比对象",
        "本次比较的设备、规格、数量和商务边界是否完全一致？",
        "定义比较对象与统一口径，防止型号、配置、税费或交付范围差异造成假性价差。",
        ["priceTotal", "confidence", "gaps"],
        [
          "技术规格是否同口径",
          "数量和单位是否一致",
          "税费、运费与安装范围是否统一",
        ],
        [
          action("冻结技术规格和比较口径", "技术负责人", "比价前", "P0"),
          action("补齐缺失参数与附件", "询价经办人", "24小时"),
        ],
        [links.equipment, links.inquiries, links.evidence],
      ),
      chapter(
        "供应商报价",
        "有效报价数量、响应质量和来源证据是否满足竞争性要求？",
        "汇总供应商响应、有效回复与报价证据，区分未回复、无效报价和可比报价。",
        ["suppliers", "supplierResponse", "inquiryTrend", "evidenceGap"],
        [
          "是否达到最低有效报价家数",
          "报价是否在有效期内",
          "供应商主体与联系人是否已核验",
        ],
        [
          action("催收未回复重点供应商", "采购经办人", "截止日前", "P1"),
          action("核验报价函、签章和有效期", "商务审核人", "比价前", "P0"),
        ],
        [links.suppliers, links.inquiries, links.evidence],
      ),
      chapter(
        "价格对比",
        "最低价、均衡价和异常价之间的差距是否合理？",
        "在统一币种和价格条件下比较报价，识别异常低价、重复报价和价格离群点。",
        ["priceTotal", "updates", "confidence", "highRisk"],
        [
          "价差是否超过授权阈值",
          "最低价是否存在漏项",
          "汇率和价格条款是否统一",
        ],
        [
          action("对异常低价发起澄清", "商务经理", "48小时", "P0"),
          action("统一币种、税费和价格术语", "成本工程师", "比价确认前"),
        ],
        [links.inquiries, links.analytics, links.equipment],
      ),
      chapter(
        "技术偏差",
        "低价方案是否以牺牲性能、材质、认证或备件范围为代价？",
        "逐项列出技术偏差、缺失参数和替代方案，评估对全寿命周期与验收的影响。",
        ["gaps", "confidence", "evidenceGap"],
        [
          "强制参数是否满足",
          "替代型号是否经过技术批准",
          "偏差是否影响质保、能耗和维护",
        ],
        [
          action("形成技术偏差关闭清单", "技术负责人", "定标前", "P0"),
          action("对替代型号组织联合评审", "项目经理", "3个工作日"),
        ],
        [links.equipment, links.evidence],
      ),
      chapter(
        "交付条件",
        "交期、付款、质保和属地服务是否会改变表面价格优势？",
        "比较交期、付款节点、质保、备件和现场服务，识别履约成本与进度风险。",
        ["supplierResponse", "inquiryTrend", "highRisk"],
        [
          "交期是否匹配项目关键路径",
          "付款条件是否占用现金流",
          "质保和属地服务是否可执行",
        ],
        [
          action("核实关键设备生产与运输周期", "计划经理", "定标前", "P0"),
          action("将服务与备件纳入商务澄清", "采购负责人", "本轮澄清"),
        ],
        [links.suppliers, links.inquiries],
      ),
      chapter(
        "推荐结论",
        "推荐哪家供应商，推荐依据、保留条件和替代方案是什么？",
        "综合价格、技术、交付、风险和证据形成排序，明确推荐方案不等同于自动定标。",
        ["confidence", "highRisk", "supplierResponse", "gaps"],
        ["首选与备选供应商", "推荐方案的前置条件", "需要领导批准的例外事项"],
        [
          action("批准首选及备选谈判顺序", "采购决策组", "本次会议", "P0"),
          action("将保留条件写入谈判纪要", "商务经理", "会后1日"),
        ],
        [links.inquiries, links.suppliers, links.evidence],
      ),
    ],
  },
  {
    title: "风险评估报告",
    version: "2.0",
    executivePurpose:
      "回答当前价格与供应链风险是否可接受、哪些风险需要升级处置。",
    chapters: [
      chapter(
        "风险总览",
        "当前风险暴露是否超过项目容忍度，最需要关注的三项是什么？",
        "汇总高风险记录、价格与证据缺口、可信度和供应响应，形成管理层风险画像。",
        ["highRisk", "gaps", "confidence", "supplierResponse"],
        [
          "风险总量与变化方向",
          "影响项目关键路径的风险",
          "需要升级到项目领导的事项",
        ],
        [
          action("确认风险排序与责任人", "项目经理", "立即", "P0"),
          action("建立每周风险关闭机制", "风险负责人", "每周"),
        ],
        [links.analytics, links.workbench],
      ),
      chapter(
        "价格风险",
        "哪些价格存在异常波动、样本不足或有效期失效？",
        "识别高风险价格、低可信记录和价格缺口，判断对概算、采购和合同的影响。",
        ["highRisk", "equipmentTrend", "materialTrend", "confidence"],
        [
          "异常价格是否影响预算",
          "价格月份与项目时点是否匹配",
          "是否存在单一来源依赖",
        ],
        [
          action("复核高风险价格的来源与月份", "价格审核人", "48小时", "P0"),
          action("对关键缺口启动补充采集", "价格管理员", "本周"),
        ],
        [links.equipment, links.material, links.collection],
      ),
      chapter(
        "供应风险",
        "重点供应商是否具备稳定响应、交付和履约能力？",
        "结合供应商数量、询价响应和风险记录，识别单一供应、低响应和履约不确定性。",
        ["suppliers", "supplierResponse", "inquiryTrend", "highRisk"],
        [
          "是否存在单一来源",
          "关键供应商是否持续不响应",
          "属地服务和交期是否可验证",
        ],
        [
          action("为单一来源设备建立备选供应商", "采购负责人", "本月", "P0"),
          action("对低响应供应商升级沟通", "供应商经理", "48小时"),
        ],
        [links.suppliers, links.inquiries],
      ),
      chapter(
        "证据缺口",
        "现有结论能否经受审计、复核和合同争议检验？",
        "检查报价文件、附件验证状态和数据来源，明确无证据、证据过期及关联错误。",
        ["evidenceGap", "leadGap", "gaps", "confidence"],
        [
          "关键结论是否有原始附件",
          "证据是否完成核验",
          "价格记录与证据是否可追溯",
        ],
        [
          action("补齐高金额记录的原始证据", "档案管理员", "审批前", "P0"),
          action("修复证据与业务对象关联", "数据管理员", "3个工作日"),
        ],
        [links.evidence, links.leads],
      ),
      chapter(
        "影响等级",
        "风险一旦发生，将影响成本、进度、质量还是合规？",
        "按影响范围、发生可能性和可恢复性确定优先级，避免只按风险数量判断。",
        ["highRisk", "gaps", "confidence", "inquiryTrend"],
        [
          "成本暴露金额与预算影响",
          "关键路径延误可能",
          "质量与合规后果",
          "风险是否可通过替代方案恢复",
        ],
        [
          action("对P0风险开展情景分析", "项目控制经理", "本周", "P0"),
          action("确认风险接受或转移策略", "项目领导", "下次决策会"),
        ],
        [links.analytics, links.project],
      ),
      chapter(
        "处置建议",
        "哪些风险必须立即关闭，哪些可监控或接受？",
        "形成规避、降低、转移、接受四类策略，并明确责任人、完成时间和复核方式。",
        ["highRisk", "gaps", "supplierResponse", "evidenceGap"],
        ["P0风险关闭路径", "需要追加预算或资源的事项", "风险接受的授权层级"],
        [
          action("审批P0风险处置资源", "项目领导", "立即", "P0"),
          action("跟踪风险动作与证据关闭", "风险负责人", "每周"),
        ],
        [links.workbench, links.analytics, links.evidence],
      ),
    ],
  },
  {
    title: "采购决策建议报告",
    version: "2.0",
    executivePurpose:
      "回答采购方案是否具备决策条件、推荐策略和授权事项是什么。",
    chapters: [
      chapter(
        "采购需求",
        "采购范围、数量、时间和关键技术要求是否已经稳定？",
        "说明需求范围、项目阶段、交付窗口和不可妥协条件，识别需求变更风险。",
        ["priceTotal", "inquiryTrend", "gaps", "confidence"],
        ["需求是否已冻结", "采购批次是否匹配现场计划", "关键技术条件是否清晰"],
        [
          action("确认采购范围与交付批次", "项目经理", "决策前", "P0"),
          action("关闭需求与BOQ差异", "技术负责人", "2个工作日"),
        ],
        [links.project, links.inquiries],
      ),
      chapter(
        "可选方案",
        "有哪些可执行方案，各自的适用条件和退出机制是什么？",
        "列出供应商、替代型号、分批采购和重新询价等方案，避免只给出单一答案。",
        ["suppliers", "supplierResponse", "gaps", "highRisk"],
        ["首选、备选与兜底方案", "替代方案的技术前提", "重新询价的时间成本"],
        [
          action("保留至少一个可执行备选方案", "采购负责人", "定标前", "P0"),
          action("对替代方案完成技术确认", "技术负责人", "3个工作日"),
        ],
        [links.suppliers, links.inquiries, links.equipment],
      ),
      chapter(
        "综合成本",
        "采购价格之外，交付、运维、汇率和风险成本是否已纳入？",
        "从采购价、物流、税费、备件、维护和潜在延期等维度评价全寿命周期成本。",
        ["priceTotal", "equipmentTrend", "materialTrend", "highRisk"],
        [
          "表面最低价是否仍是综合最低成本",
          "现金流和付款条件影响",
          "延期与质量风险成本",
        ],
        [
          action("统一综合成本计算口径", "成本负责人", "决策前", "P0"),
          action("对汇率和运输风险设置敏感性区间", "财务负责人", "本次评审"),
        ],
        [links.project, links.analytics],
      ),
      chapter(
        "供应商评价",
        "推荐供应商的响应、履约、技术和属地能力是否匹配项目要求？",
        "结合询价响应、有效报价和风险记录，评价供应商可靠性与合作条件。",
        ["suppliers", "supplierResponse", "inquiryTrend", "highRisk"],
        ["历史响应与履约表现", "产能和交期承诺可信度", "售后与属地服务能力"],
        [
          action("完成候选供应商尽调", "供应商经理", "定标前", "P0"),
          action("确认关键人员与售后资源", "采购经办人", "商务澄清阶段"),
        ],
        [links.suppliers, links.inquiries],
      ),
      chapter(
        "决策建议",
        "建议采用什么采购策略，预期收益和主要代价是什么？",
        "综合数据形成推荐排序、谈判策略和保留条件，明确AI仅提供辅助判断。",
        ["confidence", "supplierResponse", "highRisk", "gaps"],
        ["推荐方案与理由", "谈判目标与底线", "触发备选方案的条件"],
        [
          action("批准推荐方案进入商务谈判", "采购决策组", "本次会议", "P0"),
          action("授权谈判目标与退出条件", "项目领导", "谈判前"),
        ],
        [links.inquiries, links.suppliers, links.evidence],
      ),
      chapter(
        "审批事项",
        "本次会议具体需要批准什么，哪些事项仍需补充后再议？",
        "把结论转化为金额、供应商、合同条件、例外和后续节点等明确审批项。",
        ["highRisk", "gaps", "confidence", "evidenceGap"],
        [
          "采购策略与候选供应商",
          "预算与授权额度",
          "风险接受与例外条件",
          "未决事项和下次决策节点",
        ],
        [
          action(
            "逐项记录批准、附条件批准或退回",
            "会议主持人",
            "会议现场",
            "P0",
          ),
          action("将审批条件写入任务台账", "会议秘书", "会后1日"),
        ],
        [links.project, links.inquiries, links.workbench],
      ),
    ],
  },
  {
    title: "月度价格监测报告",
    version: "2.0",
    executivePurpose:
      "回答本月价格市场发生了什么、对预算采购有什么影响、下月如何行动。",
    chapters: [
      chapter(
        "数据覆盖",
        "本月样本是否足够、来源是否可靠、哪些地区或品类仍为空白？",
        "说明设备、地材、供应商、采集任务和证据的覆盖范围，提示截断与样本偏差。",
        ["priceTotal", "updates", "suppliers", "confidence"],
        [
          "样本量是否满足趋势判断",
          "关键品类和地区是否覆盖",
          "数据来源与月份是否完整",
        ],
        [
          action("补齐低覆盖地区和关键品类", "价格管理员", "下月首周", "P1"),
          action("复核低可信样本来源", "审核人", "本月结账前"),
        ],
        [links.collection, links.equipment, links.material],
      ),
      chapter(
        "价格指数",
        "设备和地材价格方向是否发生显著变化？",
        "比较本周期与前周期的新增及变化方向，提示指数仅反映已入库有效样本。",
        ["equipmentTrend", "materialTrend", "updates", "confidence"],
        [
          "设备与地材变化方向",
          "变化是否连续且具备样本支撑",
          "是否影响预算基准",
        ],
        [
          action("对连续上行品类设置预警", "成本负责人", "立即", "P1"),
          action("核对指数样本与异常值", "数据分析师", "2个工作日"),
        ],
        [links.analytics, links.equipment, links.material],
      ),
      chapter(
        "分类趋势",
        "哪些设备或材料类别推动本月变化？",
        "结合设备、地材和价格缺口识别重点类别，避免总指数掩盖结构性变化。",
        ["equipmentTrend", "materialTrend", "equipmentGap", "materialGap"],
        [
          "上涨贡献最大的类别",
          "样本不足但项目需求高的类别",
          "是否需要专项采集",
        ],
        [
          action("建立重点品类月度清单", "价格管理员", "每月", "P1"),
          action("对缺口品类发起专项采集", "采集负责人", "本周"),
        ],
        [links.collection, links.equipment, links.material],
      ),
      chapter(
        "地区差异",
        "不同项目地区的可比价格差异是否来自物流、税费或供需？",
        "提示地区口径、币种和价格条款差异，要求在跨地区比较前完成标准化。",
        ["priceTotal", "suppliers", "confidence", "gaps"],
        ["地区样本是否均衡", "物流税费是否标准化", "属地供应能力是否影响价格"],
        [
          action("补齐地区、币种和价格条款字段", "数据管理员", "本月", "P0"),
          action("对重点地区建立独立基准", "成本负责人", "下月"),
        ],
        [links.analytics, links.suppliers],
      ),
      chapter(
        "异常波动",
        "哪些价格波动超出正常范围，是否存在错误、过期或市场事件？",
        "聚焦高风险、低可信和证据不足记录，区分真实市场变化与数据异常。",
        ["highRisk", "gaps", "evidenceGap", "confidence"],
        [
          "异常是否由单一来源导致",
          "价格有效期和月份是否正确",
          "是否需要暂停使用相关数据",
        ],
        [
          action("冻结未核验异常价格的正式使用", "价格审核人", "立即", "P0"),
          action("完成异常记录来源复核", "数据管理员", "48小时"),
        ],
        [links.leads, links.evidence, links.analytics],
      ),
      chapter(
        "下月展望",
        "下月哪些品类需要提前锁价、重点采集或扩大询价？",
        "根据趋势、风险、供应响应和缺口提出下月监测重点与触发条件。",
        ["equipmentTrend", "materialTrend", "supplierResponse", "gaps"],
        ["锁价与等待的品类清单", "下月采集和询价优先级", "触发预算调整的阈值"],
        [
          action("批准下月重点监测清单", "商务经理", "月度会议", "P1"),
          action("启动高优先级品类询价与采集", "采购负责人", "下月首周"),
        ],
        [links.collection, links.inquiries, links.analytics],
      ),
    ],
  },
];

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
}

function number(value: unknown) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function metricValue(snapshot: JsonObject, key: MetricKey): ReportMetric {
  const kpis = Array.isArray(snapshot.kpis) ? snapshot.kpis.map(object) : [];
  const kpi = (label: string) =>
    kpis.find((item) => String(item.label) === label) ?? {};
  const trend = object(snapshot.trendSummary);
  const gaps = Array.isArray(snapshot.priceGapAnalysis)
    ? snapshot.priceGapAnalysis.map(object)
    : [];
  const gap = (label: string) =>
    gaps.find((item) => String(item.label) === label) ?? {};
  const suppliers = Array.isArray(snapshot.supplierPerformance)
    ? snapshot.supplierPerformance.map(object)
    : [];
  const topSupplier = suppliers[0] ?? {};
  const map: Record<MetricKey, ReportMetric> = {
    priceTotal: {
      label: "正式价格记录",
      value: `${String(kpi("价格数据总量").value ?? 0)} 条`,
      interpretation: "设备与地材价格库当前有效规模",
    },
    updates: {
      label: "区间新增",
      value: `${String(kpi("区间新增").value ?? 0)} 条`,
      interpretation: String(kpi("区间新增").trend ?? "当前统计周期"),
    },
    suppliers: {
      label: "供应商覆盖",
      value: `${String(kpi("供应商数量").value ?? 0)} 家`,
      interpretation: "当前组织已建档供应商",
    },
    aiTasks: {
      label: "AI任务",
      value: `${String(kpi("AI任务数量").value ?? 0)} 项`,
      interpretation: "统计周期内真实执行任务",
    },
    highRisk: {
      label: "高风险记录",
      value: `${String(kpi("高风险记录").value ?? 0)} 条`,
      interpretation: "必须进入人工复核",
    },
    gaps: {
      label: "价格与证据缺口",
      value: `${String(kpi("价格与证据缺口").value ?? 0)} 项`,
      interpretation: "未关闭前限制正式结论",
    },
    confidence: {
      label: "分析可信度",
      value: `${number(snapshot.analysisConfidence)}%`,
      interpretation: "低于审核阈值时不得直接批准",
    },
    equipmentTrend: {
      label: "设备价格变化",
      value: String(trend.equipment ?? "暂无变化"),
      interpretation: "与上一统计周期比较",
    },
    materialTrend: {
      label: "地材价格变化",
      value: String(trend.material ?? "暂无变化"),
      interpretation: "与上一统计周期比较",
    },
    inquiryTrend: {
      label: "询价任务变化",
      value: String(trend.inquiry ?? "暂无变化"),
      interpretation: "反映市场询价活跃度",
    },
    supplierResponse: {
      label: "最佳供应响应",
      value: suppliers.length
        ? `${String(topSupplier.response ?? 0)}%`
        : "暂无有效回复",
      interpretation: suppliers.length
        ? String(topSupplier.name ?? "重点供应商")
        : "需扩大有效询价样本",
    },
    equipmentGap: {
      label: "设备价格缺口",
      value: `${String(gap("设备价格缺口").value ?? 0)} 项`,
      interpretation: String(gap("设备价格缺口").percent ?? "0%"),
    },
    materialGap: {
      label: "地材价格缺口",
      value: `${String(gap("地材价格缺口").value ?? 0)} 项`,
      interpretation: String(gap("地材价格缺口").percent ?? "0%"),
    },
    leadGap: {
      label: "待补充线索",
      value: `${String(gap("待补充线索").value ?? 0)} 项`,
      interpretation: "价格线索仍需审核或补充",
    },
    evidenceGap: {
      label: "待核验证据",
      value: `${String(gap("待核验证据").value ?? 0)} 项`,
      interpretation: "附件证据尚未完成核验",
    },
  };
  return map[key];
}

function linkedContextMetrics(snapshot: JsonObject): ReportMetric[] {
  const linked = object(snapshot.linkedContext);
  const data = object(linked.data);
  const kind = String(linked.kind ?? "");
  if (kind === "project_pricing") {
    const summary = object(data.summary);
    const totalItems = number(summary.totalItems);
    const matchedItems = number(summary.matchedItems);
    return [
      {
        label: "关联项目BOQ",
        value: `${totalItems} 项`,
        interpretation: "来自项目套价方案实时明细",
      },
      {
        label: "套价覆盖率",
        value: `${totalItems ? Math.round((matchedItems / totalItems) * 100) : 0}%`,
        interpretation: `${matchedItems}/${totalItems} 项已有匹配价格`,
      },
      {
        label: "项目价格缺口",
        value: `${number(summary.gapItems)} 项`,
        interpretation: "需要询价或人工补价",
      },
      {
        label: "项目套价估值",
        value: `USD ${number(summary.totalUsd).toLocaleString("zh-CN")}`,
        interpretation: "按已匹配项目计算，不含未定价缺口",
      },
    ];
  }
  if (kind === "comparison") {
    const quotes = Array.isArray(data.wpi_comparison_quotes)
      ? data.wpi_comparison_quotes.map(object)
      : [];
    return [
      {
        label: "关联比价报价",
        value: `${quotes.length} 家`,
        interpretation: "来自当前比价任务的真实供应商报价",
      },
      {
        label: "已选供应商",
        value: data.selected_supplier_id ? "已选择" : "待决策",
        interpretation: String(data.status ?? "比价状态待确认"),
      },
    ];
  }
  if (kind === "inquiry") {
    const items = Array.isArray(data.wpi_inquiry_items)
      ? data.wpi_inquiry_items
      : [];
    const suppliers = Array.isArray(data.wpi_inquiry_suppliers)
      ? data.wpi_inquiry_suppliers.map(object)
      : [];
    const replies = suppliers.filter(
      (item) =>
        item.replied_at ||
        ["responded", "quoted", "completed"].includes(
          String(item.response_status),
        ),
    ).length;
    return [
      {
        label: "询价对象",
        value: `${items.length} 项`,
        interpretation: "来自关联询价任务",
      },
      {
        label: "供应商响应",
        value: `${replies}/${suppliers.length} 家`,
        interpretation: "已回复供应商占本次询价邀请数",
      },
    ];
  }
  return [];
}

export function getReportTemplateSpec(title: string) {
  return (
    reportTemplateSpecs.find((template) => template.title === title) ??
    reportTemplateSpecs[0]
  );
}

export function buildStructuredReportChapters(
  templateTitle: string,
  snapshotValue: unknown,
  existingOutputValue?: unknown,
  context?: {
    project?: string;
    period?: string;
    source?: string;
    sourceId?: string | null;
  },
): StructuredReportChapter[] {
  const template = getReportTemplateSpec(templateTitle);
  const snapshot = object(snapshotValue);
  const existingOutput = object(existingOutputValue);
  const existingChapters = Array.isArray(existingOutput.chapters)
    ? existingOutput.chapters.map(object)
    : [];
  const generatedAt = String(snapshot.generatedAt ?? new Date().toISOString());
  const snapshotReference = `业务数据快照 ${generatedAt.slice(0, 10)}`;
  const project = context?.project || "全项目汇总";
  const period = context?.period || `近 ${number(snapshot.rangeDays) || 30} 天`;
  const source =
    context?.source || String(snapshot.source ?? "Supabase业务数据");

  return template.chapters.map((spec, index) => {
    const existing =
      existingChapters.find((item) => String(item.title) === spec.title) ??
      existingChapters[index] ??
      {};
    const existingSummary = String(existing.summary ?? "").trim();
    const existingFindings = stringList(existing.findings);
    const existingEvidence = stringList(existing.evidenceRefs);
    const metrics = [
      ...linkedContextMetrics(snapshot),
      ...spec.metricKeys.map((key) => metricValue(snapshot, key)),
    ].slice(0, 4);
    const metricSentence = metrics
      .slice(0, 3)
      .map((item) => `${item.label}${item.value}`)
      .join("，");
    const summary =
      existingSummary.length >= 20
        ? existingSummary
        : `${spec.purpose} 本章基于${source}，覆盖${project}、${period}的数据进行判断；当前关键读数为${metricSentence || "数据待补充"}。管理层应围绕“${spec.leadershipQuestion}”作出明确判断，任何AI结论均需结合原始业务记录和人工复核后使用。`;
    const dynamicFinding = metrics.map(
      (item) => `${item.label}：${item.value}；${item.interpretation}。`,
    );
    return {
      title: spec.title,
      leadershipQuestion: spec.leadershipQuestion,
      summary,
      findings: existingFindings.length
        ? existingFindings
        : [
            ...dynamicFinding,
            ...spec.decisionFocus.map((item) => `领导关注：${item}`),
          ],
      evidenceRefs: existingEvidence.length
        ? existingEvidence
        : [
            snapshotReference,
            context?.sourceId
              ? `关联业务 ${context.sourceId}`
              : "组织级业务汇总",
          ],
      metrics,
      decisionFocus: spec.decisionFocus,
      actions: spec.actions,
      dataLinks: spec.dataLinks,
    };
  });
}
