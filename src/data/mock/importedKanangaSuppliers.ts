import type { ConfidenceLevel, RiskLevel } from "@/types/common";

export type ImportedKanangaSupplier = {
  id: string; supplierCode: string; supplierName: string; englishName: string; countryCode: string; countryRegion: string; category: string; mainScope: string; contact: string; whatsapp: string; email: string; phone: string; website: string; quoteCount: number; lastQuoteAt: string; responseSpeed: "快" | "较快" | "一般" | "较慢"; technicalCapability: number; deliveryRisk: RiskLevel; overallScore: number; confidence: ConfidenceLevel; aiEvaluation: string; riskLevel: RiskLevel; status: "活跃" | "待复核" | "暂停"; dataCompleteness: number; importBatch: string; sourceFile: string; sourceSheet: string; sourceRows: number[]; bidPackages: string[]; equipmentLists: string[]; procurementStrategies: string[]; strengths: string[]; introductions: string[]; mainProducts: string[]; addresses: string[]; contactDetails: string; notes: string[];
};

export const importedKanangaSuppliers: ImportedKanangaSupplier[] = [
  {
    "id": "SUP-KNG-001",
    "supplierCode": "SUP-KNG-202607-001",
    "supplierName": "上海凯士比泵有限公司KSB",
    "englishName": "Shanghai KSB Pump Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 泵类： Etanorm：全球销量超150万台的标准化水泵，应用于水厂、建筑供水等领域。 Amarex KRT：潜水污水泵，支持多类型",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "ksbpump.shanghai@ksb.com",
    "phone": "电话：+86 4000218000；电话：+86 2164308030",
    "website": "https://www.ksb.com/zh-cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      3,
      25
    ],
    "bidPackages": [
      "取水与预处理设备包",
      "泵阀与管道设备包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池",
      "1. 泵类设备  \n   - 清水输送泵（离心泵）  \n   - 增压泵（多级离心泵）  \n   - 循环水泵（变频控制）  \n2. 阀门类设备 \n   - 电动/气动蝶阀（DN150-DN1200）  \n   - 止回阀、闸阀、球阀  \n   - 减压阀及安全阀  \n3. 管道及配件 \n   - 不锈钢/球墨铸铁输水管  \n   - 法兰、弯头、三通等管件  \n   - 管道防腐保温材料"
    ],
    "procurementStrategies": [
      "*集中采购*：\n组合设备：取水泵 + 格栅除污机 + 加药系统（由一家综合供应商提供，减少接口协调）\n\n优势：确保取水与预处理环节的流量匹配，避免不同厂商设备兼容性问题。",
      "*泵阀捆绑采购*：\n组合设备：高压泵 + 配套阀门（由同一厂商提供，确保密封性）\n\n优势：降低泄漏风险，简化安装流程。"
    ],
    "strengths": [
      "（高压取水泵 + 预处理集成方案）\nMultiTec Plus系列泵（扬程250米，流量470m³/h），搭载智能调速系统，适配高压取水场景。  ",
      "Omega多级泵 + BOA蝶阀，耐高压耐腐蚀"
    ],
    "introductions": [
      "成立时间：1871年，总部位于德国弗兰肯塔尔（Frankenthal），是全球领先的泵、阀门及系统解决方案供应商。\n企业定位：\n全球拥有约16,000名员工，年营收超30亿欧元，业务覆盖190多个国家，专注于工业、建筑服务、水处理、能源及采矿领域。\n在中国市场深耕多年，设立6家分公司（上海、常州、大连、天津等），拥有900多名员工及60多家认证服务合作伙伴，服务网络覆盖全国21个省份。\n以技术创新为核心，累计研发成果包括高效水力设计、材料科学及自动化技术，参与制定多项国际标准。"
    ],
    "mainProducts": [
      "※核心产品：\n泵类：\nEtanorm：全球销量超150万台的标准化水泵，应用于水厂、建筑供水等领域。\nAmarex KRT：潜水污水泵，支持多类型叶轮（如涡流式、单叶片式）。\nMegaCPK/Omega：高压泵及双吸泵，适用于工业水处理及海水淡化。\n阀门类：\nISORIA 10/16：中央截止阀，支持气动、电动等多种驱动方式。\nSERIE 2000：双翼止回阀，免维护设计，适用于高卫生标准场景。\n服务与解决方案：\n提供泵阀维修、节能咨询、智能化运维（如KSB SupremeServ全球服务网络）及定制化工程服务。"
    ],
    "addresses": [
      "上海凯士比泵有限公司地址：上海市闵行工业园区（中德合资企业）。\n凯士比阀业（常州）有限公司地址：常州市新北区，专业生产美标阀门。"
    ],
    "contactDetails": "泵类\n电话：+86 4000218000\n电子邮箱：ksbpump.shanghai@ksb.com\n\n阀门\n电话：+86 2164308030\n电子邮箱：ksbvs_shanghai@ksb.com\n中国区官网：https://www.ksb.com/zh-cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-002",
    "supplierCode": "SUP-KNG-202607-002",
    "supplierName": "上海凯泉泵业（集团）有限公司",
    "englishName": "Shanghai Kaiquan Pump(Group) Co.,Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 单级泵、双吸泵、多级泵、化工泵、污水泵、渣浆泵、核泵等。 给水设备、泵用控制设备及一体化泵站。 定制化泵系统解决方案，覆盖建筑、市政",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "官方电话：400-9969-679",
    "website": "https://www.kaiquan.com.cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      4
    ],
    "bidPackages": [
      "取水与预处理设备包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池"
    ],
    "procurementStrategies": [
      "*集中采购*：\n组合设备：取水泵 + 格栅除污机 + 加药系统（由一家综合供应商提供，减少接口协调）\n\n优势：确保取水与预处理环节的流量匹配，避免不同厂商设备兼容性问题。"
    ],
    "strengths": [
      "国产龙头，提供立式/卧式多级离心泵，性价比高"
    ],
    "introductions": [
      "成立时间：1995年。\n企业定位：集设计、生产、销售泵、给水设备及泵用控制设备于一体的大型综合性泵业集团，是中国泵行业龙头企业。\n资产规模：总资产约45亿元至70亿元（不同来源数据差异，官网最新显示为70亿元）。\n生产规模：在上海、浙江、合肥、沈阳、石家庄等地拥有5个工业园区，总占地面积近1000亩，生产性建筑面积35万平方米。\n员工与技术：员工总数6000余人，其中工程技术人员1200余名，包括专家教授、博士硕士及中高级工程师，形成创新梯队人才结构。\n荣誉与认证：\n获“上海市质量金奖”“全国机械百强企业”“中国驰名商标”等多项荣誉，并通过ISO质量、环境、职业健康安全管理体系认证。"
    ],
    "mainProducts": [
      "※核心产品：\n单级泵、双吸泵、多级泵、化工泵、污水泵、渣浆泵、核泵等。\n给水设备、泵用控制设备及一体化泵站。\n定制化泵系统解决方案，覆盖建筑、市政、电力、石油、化工、矿山、核电等领域\n※技术特色：\n采用CFD流体力学分析、精密铸造工艺及智能化生产线，注重节能减排与绿色技术创新"
    ],
    "addresses": [
      "总部地址：上海市汶水路857号\n其他工业园区分布于浙江、合肥、沈阳、石家庄等地"
    ],
    "contactDetails": "官方电话：400-9969-679\n其他渠道：021-69153261、021-67119746\n官方主网站： https://www.kaiquan.com.cn/",
    "notes": []
  },
  {
    "id": "SUP-KNG-003",
    "supplierCode": "SUP-KNG-202607-003",
    "supplierName": "金剑环保集团有限公司",
    "englishName": "Jinjian Environmental Protection Group Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品系列： 水处理设备：一体化净水装置、全自动压力式净水站、沉淀池吸（刮）泥机、浓缩机驱动装置、格栅等。 环保工程设备：无负压二次供水装置、",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "官网电话：400-600-2516；固定电话：0577-5577 9150",
    "website": "https://www.jinjianhb.com/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      5,
      10
    ],
    "bidPackages": [
      "取水与预处理设备包",
      "混凝与沉淀设备包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池",
      "1. 混合与絮凝设备\n   - 管道混合器（静态/动态）  \n   - 网格/折板絮凝池装置  \n   - 机械搅拌机（变频调速）  \n2. 沉淀设备  \n   - 平流沉淀池刮泥机  \n   - 斜板/斜管沉淀装置（PP材质）  \n   - 沉淀池排泥阀及排泥泵  \n3. 气浮设备\n   - 溶气气浮机（DAF）  \n   - 溶气释放器（GTV系列）  \n   - 空压机及溶气罐"
    ],
    "procurementStrategies": [
      "*集中采购*：\n组合设备：取水泵 + 格栅除污机 + 加药系统（由一家综合供应商提供，减少接口协调）\n\n优势：确保取水与预处理环节的流量匹配，避免不同厂商设备兼容性问题。",
      "*成套工艺采购*：\n组合设备：絮凝装置 + 沉淀池刮泥机 + 气浮机（由沉淀技术专精厂商提供，技术联动性强）\n\n优势：保证沉淀效率与污泥处理衔接"
    ],
    "strengths": [
      "预处理成套设备，含加药系统",
      "网格絮凝+平流沉淀池成套设备，案例覆盖700余座水厂"
    ],
    "introductions": [
      "成立时间：2002年，总部位于浙江省乐清市经济开发区，是一家集环保工程设计、设备研发、制造安装及运营服务于一体的综合型环保企业239。\n企业定位：\n专注于城市与农村自来水及污水处理、工业用水和废水处理、污泥处理、小流域水环境治理、臭（废）气处理等领域。\n国家级高新技术企业，拥有60余项国家专利，参与多个国家星火计划项目，为国内外500多家水厂和污水处理厂提供设备与技术方案。\n与法国得利满（DEGREMONT）、威利雅（OTV）等国际企业合作，是其指定产品供应商。\n生产规模：\n拥有三个生产基地、一个技术研发中心，上海设有销售中心，员工约300人。通过ISO9001、ISO14001、OHSAS18001三体系认证，产品达到国内先进水平。"
    ],
    "mainProducts": [
      "※核心产品系列：\n水处理设备：一体化净水装置、全自动压力式净水站、沉淀池吸（刮）泥机、浓缩机驱动装置、格栅等。\n环保工程设备：无负压二次供水装置、加药设备、粉料投加系统、污泥处理设备、钢管等。\n配套产品：不锈钢风量调节阀、可视流量指示器、止回阀等。\n※技术特色：\n产品覆盖市政、工业、农村等多个领域，技术优势包括高效节能、智能化控制及环保适配性。"
    ],
    "addresses": [
      "总部地址：浙江省乐清市经济开发区纬十六路177号\n分部地址：\n浙江省乐清市经济开发区纬十八路237号\n上海市杨浦区大连路950弄海上海商务楼8号楼2108室"
    ],
    "contactDetails": "官网电话：400-600-2516\n固定电话：0577-5577 9150\n官方主网站： https://www.jinjianhb.com/",
    "notes": []
  },
  {
    "id": "SUP-KNG-004",
    "supplierCode": "SUP-KNG-202607-004",
    "supplierName": "山东艾克水处理技术有限公司",
    "englishName": "Shandong Exlen Water Treatment Technology Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品系列： 膜化学品：反渗透膜阻垢剂、杀菌剂、絮凝剂、清洗剂、还原剂等。 循环冷却水化学品：缓蚀阻垢剂、无磷环保阻垢剂、杀菌灭藻剂、粘泥剥离",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "联系电话：；400-098-0530（全国服务热线）；0530-8307196（固定电话）",
    "website": "http://www.4000980530.com/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      6
    ],
    "bidPackages": [
      "取水与预处理设备包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池"
    ],
    "procurementStrategies": [
      "*集中采购*：\n组合设备：取水泵 + 格栅除污机 + 加药系统（由一家综合供应商提供，减少接口协调）\n\n优势：确保取水与预处理环节的流量匹配，避免不同厂商设备兼容性问题。"
    ],
    "strengths": [
      "集成化预处理系统（原水箱+多介质过滤+软化器），适配复杂水源"
    ],
    "introductions": [
      "成立时间：根据工商信息，公司注册于2021年10月28日（另一关联公司“菏泽开发区艾克水处理有限公司”成立于2012年，可能为前身或分支机构）。\n企业定位：\n专注于水处理专用化学品的研发、生产及销售，产品涵盖反渗透膜系列、循环冷却水系列、污水处理系列等百余种药剂。\n服务领域包括电力、钢铁、油田、造纸、纺织印染、化工、食品饮料及制药等行业，累计客户超5000家。\n拥有2个生产厂区（鲁西新区高新产业园、曹县化工园区），总占地面积200余亩，配备高标准实验室及动态模拟设备。"
    ],
    "mainProducts": [
      "※核心产品系列：\n膜化学品：反渗透膜阻垢剂、杀菌剂、絮凝剂、清洗剂、还原剂等。\n循环冷却水化学品：缓蚀阻垢剂、无磷环保阻垢剂、杀菌灭藻剂、粘泥剥离剂等。\n锅炉水处理剂：高温阻垢剂、除氧剂、PH调节剂。\n其他领域：中央空调化学品、油田助剂、纺织印染废水处理剂等。"
    ],
    "addresses": [
      "地址：山东省菏泽市高新区中华西路2059号西楼菏泽高新区金融总部经济园区6650室"
    ],
    "contactDetails": "联系电话：\n400-098-0530（全国服务热线）\n0530-8307196（固定电话）\n官网：http://www.4000980530.com/",
    "notes": []
  },
  {
    "id": "SUP-KNG-005",
    "supplierCode": "SUP-KNG-202607-005",
    "supplierName": "哈希水质分析仪器（上海）有限公司",
    "englishName": "Hach Water Analysis Instruments (Shanghai) Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 实验室分析仪：如DR系列分光光度计（DR6000、DR3900）、COD测定仪（DR1010）、BOD分析仪（BODTrakⅡ）",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "HachChinaCC@hach.com",
    "phone": "客服电话：；400-686-8899（全国统一服务热线）。；客服电话：",
    "website": "https://www.hach.com.cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      7,
      32
    ],
    "bidPackages": [
      "取水与预处理设备包",
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池",
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "*分项采购*：  \n“水质监测仪”单独招标",
      "*仪表分项补充*\n水质监测仪选择专精品牌"
    ],
    "strengths": [
      "在线浊度/余氯监测"
    ],
    "introductions": [
      "成立时间：1947年，总部位于美国科罗拉多州拉夫兰（Loveland），1999年加入美国丹纳赫集团（Danaher Corporation），现为其一级子公司。\n企业定位：\n全球领先的水质分析解决方案提供商，专注于饮用水、污水、工业循环水、环境监测等领域，产品覆盖实验室、便携式及在线分析仪器，累计获得527项专利。\n中国市场布局：2002年设立北京代表处，2012年在上海成立哈希水质分析仪器（上海）有限公司作为中国总部，全国设十余个办事处及授权维修中心。\n核心使命：以“护卫世界上最重要的资源”为目标，提供高精度仪器与专家级服务。"
    ],
    "mainProducts": [
      "※主要经营产品：\n实验室分析仪：如DR系列分光光度计（DR6000、DR3900）、COD测定仪（DR1010）、BOD分析仪（BODTrakⅡ）。\n便携式仪器：浊度仪（1900C）、多参数分析仪（HQ系列）、溶解氧仪（LDO荧光法技术）。\n在线监测设备：在线pH仪、电导率仪、污泥浓度计（Solitax sc）、CODmax铬法COD分析仪等。\n配套服务：水质自动采样器、流量计、智慧化运维系统（如靖帆IMS仪表管理系统）。"
    ],
    "addresses": [
      "上海总部地址：长宁区福泉北路518号10座6楼"
    ],
    "contactDetails": "客服电话：\n400-686-8899（全国统一服务热线）。\n800-840-6026（支持部分区域）。\n邮箱：\nHachChinaCC@hach.com（客服邮箱）。\ntechhelp@hach.com（技术支持邮箱，全球通用）\n官网：https://www.hach.com.cn/\n客服电话：\n400-686-8899（全国统一服务热线）。\n800-840-6026（支持部分区域）。\n邮箱：\nHachChinaCC@hach.com（客服邮箱）。\ntechhelp@hach.com（技术支持邮箱，全球通用）。",
    "notes": []
  },
  {
    "id": "SUP-KNG-006",
    "supplierCode": "SUP-KNG-202607-006",
    "supplierName": "赛默飞世尔科技",
    "englishName": "Thermo Fisher Scientific Inc",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品与服务： 分析仪器：色谱质谱仪（如Vanquish™ Core HPLC）、光谱仪（如Nicolet FTIR）、电子显微镜（SEM/T",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "sales.china@thermofisher.com",
    "phone": "联系电话：",
    "website": "https://www.thermofisher.cn/cn/zh/home.html",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      8,
      20
    ],
    "bidPackages": [
      "取水与预处理设备包",
      "消毒设备包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池",
      "1. 消毒主体设备\n   - 次氯酸钠发生器（或液氯投加系统）  \n   - 臭氧发生器（备用消毒）  \n   - 紫外线消毒器（中压/低压）  \n2. 配套系统 \n   - 消毒剂储存罐（耐腐蚀材质）  \n   - 加氯机及余氯在线监测仪  \n   - 臭氧接触池（不锈钢/混凝土）  \n3. 安全设备 \n   - 氯气泄漏报警装置  \n   - 应急中和系统（硫代硫酸钠投加装置）"
    ],
    "procurementStrategies": [
      "*分项采购*：  \n“水质监测仪”单独招标",
      "*主设备集中采购*：\n组合设备：次氯酸钠发生器 + 紫外线消毒器（适配互补消毒），选择专精企业\n\n优势：满足多重消毒需求，减少药剂残留风险"
    ],
    "strengths": [
      "实验室级分析仪器",
      "实验室级消毒验证设备，适配高标准水质保障"
    ],
    "introductions": [
      "成立时间：2006年由美国热电公司（Thermo Electron）与飞世尔科技（Fisher Scientific）合并而成，前身可追溯至1956年。\n企业定位：\n全球科学服务领域的领导者，年销售额超400亿美元，覆盖生命科学、医疗诊断、实验室设备、生物制药等领域。\n使命：“帮助客户使世界更健康、更清洁、更安全”，服务范围包括科研加速、疾病诊断、环境监测等。\n在华发展：\n自1982年在中国设立首个销售办事处，目前中国总部位于上海，拥有9家工厂（上海、北京、苏州、广州等）、3个创新研发中心和超7000名员工，覆盖全国17个城市的分支机构。"
    ],
    "mainProducts": [
      "※核心产品与服务：\n分析仪器：色谱质谱仪（如Vanquish™ Core HPLC）、光谱仪（如Nicolet FTIR）、电子显微镜（SEM/TEM）等。\n实验室设备：超低温冰箱（STP系列）、生物安全柜、离心机、PCR仪等。\n试剂与耗材：抗体、细胞培养试剂、基因测序耗材（如Applied Biosystems品牌）。\n生物制药设备：一次性生物反应器（HyPerforma™ DynaDrive™）、磁珠纯化仪（KingFisher Flex）等，部分已实现国产化。\n解决方案：实验室综合服务、制药研发（CDMO）、临床试验支持（PPD子公司）。"
    ],
    "addresses": [
      "上海总部地址：浦东新区新金桥路27号3&6&7号楼，邮编201206"
    ],
    "contactDetails": "联系电话：\n400-820-8982（生命科学产品）、400-650-5118（分析仪器及实验室设备）\n销售咨询邮箱：sales.china@thermofisher.com\n中国区官网：https://www.thermofisher.cn/cn/zh/home.html",
    "notes": []
  },
  {
    "id": "SUP-KNG-007",
    "supplierCode": "SUP-KNG-202607-007",
    "supplierName": "深圳安吉尔饮水产业集团有限公司",
    "englishName": "Shenzhen Angel Drinking Water Industrial Group Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "家用净水设备： 全屋净水系统、反渗透纯水机、厨房净水机、管线机、茶吧机等，代表产品如A6、A7系列、X-Tech全屋净水系列。 商用及工程设备：",
    "contact": "周超",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "区域销售联系电话：18824673603；官方电话：400-700-3339；区域销售联系电话：18824673603",
    "website": "https://www.angelgroup.com.cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      9,
      42
    ],
    "bidPackages": [
      "取水与预处理设备包",
      "辅助设备包"
    ],
    "equipmentLists": [
      "1. 取水设备 \n   - 取水泵（离心泵/轴流泵）  \n   - 原水提升泵  \n   - 潜水泵（备用取水）  \n2. 预处理设备 \n   - 格栅除污机（粗格栅、细格栅）  \n   - 旋转滤网  \n   - 原水流量计  \n3. 加药系统 \n   - 混凝剂（PAC、PAM）加药装置  \n   - 助凝剂投加设备  \n   - 药剂溶解搅拌罐  \n4. 配套设备 \n   - 原水水质在线监测仪（浊度、pH、温度）  \n   - 原水缓冲池",
      "1. 电力与动力 \n   - 柴油发电机（备用电源）  \n   - 高低压配电柜  \n   - 电缆及桥架  \n2. 建筑与维护 \n   - 厂区起重机（单梁/双梁）  \n   - 化学药剂储存间（防爆设计）  \n   - 实验室设备（COD测定仪、显微镜等）  \n3. 其他辅助设备\n   - 加药间通风系统  \n   - 厂区照明及安防系统"
    ],
    "procurementStrategies": [
      "*分项采购*：  \n“水质监测仪”单独招标",
      "*实验室设备单独招标*\n精密仪器选择专精品牌"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1987年，总部位于广东深。\n企业定位：\n中国净水行业龙头企业，专注净水领域37年，产品涵盖家用、商用及工程净水设备，累计获得超1000项专利，参与制定20余项国家及行业标准。\n全球布局：产品畅销65个国家，签约国际影后巩俐为全球品牌代言人，服务超500万家庭及企业用户。\n生产基地：\n拥有三大生产基地，其中安吉尔环境科技智慧园占地60万平方米，年产能达1000万台（套）净饮水产品。\n荣誉与认证：\n国家级高新技术企业，获中国驰名商标、中国名牌、德国红点设计奖、日内瓦国际发明展金奖等荣誉。\n通过中国CQC、美国NSF、德国TüV等全球八大权威机构认。"
    ],
    "mainProducts": [
      "※家用净水设备：\n全屋净水系统、反渗透纯水机、厨房净水机、管线机、茶吧机等，代表产品如A6、A7系列、X-Tech全屋净水系列。\n※商用及工程设备：\n公共直饮机、商用净水机、步进式开水器、水处理设备，服务于机场、医院、学校等场景，案例包括北京大兴机场、深圳宝安机场等。\n※技术特色：\n自主研发长效反渗透滤芯（打破国外垄断）、航天净水技术（与中国航天联合实验室合作）、智能化物联网净水解决方案。"
    ],
    "addresses": [
      "总部地址：\n广东省深圳市光明区凤凰街道塘家社区汇业路13号401。\n其他分支机构：\n深圳市宝安区石岩街道安吉尔工业园（生产基地）。"
    ],
    "contactDetails": "区域销售联系电话：18824673603\n官方电话：400-700-3339\n商用合作：400-9969-679\n官网：https://www.angelgroup.com.cn/\n区域销售联系电话：18824673603\n官方电话：400-700-3339。\n商用合作：400-9969-679。",
    "notes": []
  },
  {
    "id": "SUP-KNG-008",
    "supplierCode": "SUP-KNG-202607-008",
    "supplierName": "景津装备股份有限公司",
    "englishName": "Jingjin Equipment Inc",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 压滤机系列：快开高压隔膜压滤机、暗流板框压滤机、智能IV型快速拉开压滤机等，适用于污泥脱水、化工过滤等场景。 配套设备：振动离心机、",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "jjhbzqb@163.com",
    "phone": "联系电话：；0534-2758995（总部服务热线）。；400-810-0069转8123（中国粉体网认证电话，用于产品咨询）",
    "website": "",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      11,
      35
    ],
    "bidPackages": [
      "混凝与沉淀设备包",
      "污泥处理设备包"
    ],
    "equipmentLists": [
      "1. 混合与絮凝设备\n   - 管道混合器（静态/动态）  \n   - 网格/折板絮凝池装置  \n   - 机械搅拌机（变频调速）  \n2. 沉淀设备  \n   - 平流沉淀池刮泥机  \n   - 斜板/斜管沉淀装置（PP材质）  \n   - 沉淀池排泥阀及排泥泵  \n3. 气浮设备\n   - 溶气气浮机（DAF）  \n   - 溶气释放器（GTV系列）  \n   - 空压机及溶气罐",
      "1. 污泥脱水设备\n   - 带式污泥脱水机  \n   - 离心式脱水机  \n   - 板框压滤机（备用）  \n2. 输送设备  \n   - 螺旋输送机  \n   - 污泥泵（螺杆泵）  \n3. 干化与处置 \n   - 污泥干化机（热风能）  \n   - 污泥料仓（防腐蚀材质）"
    ],
    "procurementStrategies": [
      "*成套工艺采购*：\n组合设备：絮凝装置 + 沉淀池刮泥机 + 气浮机（由沉淀技术专精厂商提供，技术联动性强）\n\n优势：保证沉淀效率与污泥处理衔接",
      "*脱水+干化成套采购*\n组合设备：脱水机 + 干化机（由污泥处理专精厂商提供，需减量化与资源化衔接）\n\n优势：实现污泥减量化与资源化衔接"
    ],
    "strengths": [
      "气浮机 + 污泥沉淀和脱水系统集成，适配后续处理环节",
      "带式脱水机 + 太阳能干化系统，带式脱水机市场占有率超30%，适配大型项目"
    ],
    "introductions": [
      "成立时间：前身为1988年成立的河北景县东风滤板厂，2010年12月改制为景津环保股份有限公司，2019年更名为景津装备股份有限公司。\n企业定位：\n全球压滤机龙头企业，连续12年全球产销量第一，市场份额占中国市场的62.3%。\n国家级高新技术企业，中国环保产业协会副会长单位，主导制定压滤机国家标准。\n业务范围：\n集过滤成套装备制造、过滤技术整体方案解决、环保工程总承包及运营于一体，产品覆盖环保、化工、食品、制药、冶金等固液分离领域，远销123个国家和地区。\n荣誉与资质：\n国家级制造业单项冠军示范企业（2021年）。获“中国驰名商标”“国家知识产权优势企业”等认证，董事长姜桂廷获“全国五一劳动奖章”。"
    ],
    "mainProducts": [
      "※核心产品：\n压滤机系列：快开高压隔膜压滤机、暗流板框压滤机、智能IV型快速拉开压滤机等，适用于污泥脱水、化工过滤等场景。\n配套设备：振动离心机、搅拌机、输送机、自动加药机、滤布清洗系统等。\n创新技术：自主研发的“太阳能污泥一体干燥系统”“封闭式低温滤饼干燥机”，节能效率提升30%以上。\n※技术特色：\n采用德国滤布生产技术，滤布密度高、过滤速度快，滤饼自动脱落技术解决行业难题。"
    ],
    "addresses": [
      "总部地址：\n山东省德州市经济开发区晶华路北首（工商注册地址）。\n生产基地：\n山东德州（主生产基地，占地约10万-3万平方米）。\n河北景县（早期工厂，现为研发中心之一）"
    ],
    "contactDetails": "联系电话：\n0534-2758995（总部服务热线）。\n400-810-0069转8123（中国粉体网认证电话，用于产品咨询）\n邮箱：jjhbzqb@163.com\n主官网：www.jjylj.com",
    "notes": []
  },
  {
    "id": "SUP-KNG-009",
    "supplierCode": "SUP-KNG-202607-009",
    "supplierName": "江苏达泽节能环保科技有限公司",
    "englishName": "Jiangsu Daze Energy Saving and Environmental Protection Technology Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 一体化污水处理设备：适用于农村、医院、垃圾渗滤液等场景，采用“强化物化+固定化微生物”技术，模块化设计，节能高效。 智慧水务平台：支",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "电话：13915951254",
    "website": "https://www.dazehb.com/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      12,
      37
    ],
    "bidPackages": [
      "混凝与沉淀设备包",
      "污泥处理设备包"
    ],
    "equipmentLists": [
      "1. 混合与絮凝设备\n   - 管道混合器（静态/动态）  \n   - 网格/折板絮凝池装置  \n   - 机械搅拌机（变频调速）  \n2. 沉淀设备  \n   - 平流沉淀池刮泥机  \n   - 斜板/斜管沉淀装置（PP材质）  \n   - 沉淀池排泥阀及排泥泵  \n3. 气浮设备\n   - 溶气气浮机（DAF）  \n   - 溶气释放器（GTV系列）  \n   - 空压机及溶气罐",
      "1. 污泥脱水设备\n   - 带式污泥脱水机  \n   - 离心式脱水机  \n   - 板框压滤机（备用）  \n2. 输送设备  \n   - 螺旋输送机  \n   - 污泥泵（螺杆泵）  \n3. 干化与处置 \n   - 污泥干化机（热风能）  \n   - 污泥料仓（防腐蚀材质）"
    ],
    "procurementStrategies": [
      "*分项采购*：\n气浮设备可单独招标",
      "*脱水+干化成套采购*\n组合设备：脱水机 + 干化机（由污泥处理专精厂商提供，需减量化与资源化衔接）\n\n优势：实现污泥减量化与资源化衔接"
    ],
    "strengths": [
      "模块化气浮设备（HDJY全自动河水净水器），支持定制化设计",
      "干化配套设备（热风能方案），适配中小规模"
    ],
    "introductions": [
      "公司简介：\n国家级高新技术企业，与河海大学建立产学研合作，拥有市政总承包、机电安装总承包等资质。\n专注于分散式污水处理设备的研发与生产，覆盖农村、医疗、垃圾渗滤液处理等领域，自主研发智慧水务平台，提供污水处理全过程解决方案814。\n旗下设南京中禹国泽环境科学保护研究所等机构，获“国家高新技术企业”认证"
    ],
    "mainProducts": [
      "※核心产品：\n一体化污水处理设备：适用于农村、医院、垃圾渗滤液等场景，采用“强化物化+固定化微生物”技术，模块化设计，节能高效。\n智慧水务平台：支持远程运维、水质实时监测及故障预警，提升调度效率"
    ],
    "addresses": [
      "地址：江苏南京市雨花台区软件谷科创城D2南15层"
    ],
    "contactDetails": "电话：13915951254\n官网网址：https://www.dazehb.com/",
    "notes": []
  },
  {
    "id": "SUP-KNG-010",
    "supplierCode": "SUP-KNG-202607-010",
    "supplierName": "阿特拉斯·科普柯（上海）贸易有限公司",
    "englishName": "Atlas Copco (Shanghai) Trading Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 压缩机技术： 螺杆式空压机、离心式空压机、无油压缩机、移动式空压机、高压增压机等，应用于工业制造、食品医药、半导体等领域。 真空",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "unionrise@163.com",
    "phone": "中国区统一服务热线：；400-070-1858（官网标注的全国服务热线）。；400-686-9778（山东代理商电话，可能为区域服务热线）。",
    "website": "https://www.atlascopco.com.cn/zh-cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      13
    ],
    "bidPackages": [
      "混凝与沉淀设备包"
    ],
    "equipmentLists": [
      "1. 混合与絮凝设备\n   - 管道混合器（静态/动态）  \n   - 网格/折板絮凝池装置  \n   - 机械搅拌机（变频调速）  \n2. 沉淀设备  \n   - 平流沉淀池刮泥机  \n   - 斜板/斜管沉淀装置（PP材质）  \n   - 沉淀池排泥阀及排泥泵  \n3. 气浮设备\n   - 溶气气浮机（DAF）  \n   - 溶气释放器（GTV系列）  \n   - 空压机及溶气罐"
    ],
    "procurementStrategies": [
      "*分项采购*：\n“空压机”单独招标"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1873年，总部位于瑞典斯德哥尔摩，是全球领先的工业生产力解决方案提供商。\n企业定位：\n专注于压缩机技术、真空技术、工业工具与装配系统、移动空气及建筑设备四大业务领域，服务覆盖180多个国家/地区。\n2024年集团年收入约150亿欧元（不同年份数据差异较大，需以最新财报为准），全球员工约49,000人。\n中国市场：\n自1984年进入中国，目前在中国大陆拥有9家子公司（含5家工厂）、40个销售办事处、150多家分销商及覆盖全国的售后服务网络，员工超2,000人。\n主要生产基地分布在无锡、上海、青岛等地，产品出口至亚洲及全球市场。"
    ],
    "mainProducts": [
      "※主要经营产品：\n压缩机技术：\n螺杆式空压机、离心式空压机、无油压缩机、移动式空压机、高压增压机等，应用于工业制造、食品医药、半导体等领域。\n真空与减排设备：真空泵、工业气体处理系统，服务于科研、医疗及工业场景。\n建筑与采矿设备：手持式气动工具、发电机组、照明灯车、排水泵等。\n工业工具与装配系统：电动工具、自动化装配解决方案，用于汽车制造、航空航天等行业。\n配套服务：节能改造、备件供应、租赁及远程运维服务。"
    ],
    "addresses": [
      "上海总部：阿特拉斯·科普柯（上海）贸易有限公司。\n\n生产基地：无锡高新技术开发区（压缩机生产）、青岛中航工业科技园（山东代理地址：青岛市市北区周口路97号）"
    ],
    "contactDetails": "中国区统一服务热线：\n400-070-1858（官网标注的全国服务热线）。\n400-686-9778（山东代理商电话，可能为区域服务热线）。\n邮箱：unionrise@163.com（山东代理商邮箱）\n中国区官网：https://www.atlascopco.com.cn/zh-cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-011",
    "supplierCode": "SUP-KNG-202607-011",
    "supplierName": "英格索兰",
    "englishName": "Ingersoll Rand Inc",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 压缩机系统： 无油螺杆压缩机、离心式压缩机、活塞式压缩机，适用于汽车修理、食品制药、工业制造等领域。 动力工具： 气动冲击工具、",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "联系电话：；上海公司服务热线：021-3466 5187（支持7×24小时咨询）；区域销售热线：1391746064、13391146044（配件订购及技术服务）",
    "website": "https://www.ingersollrand.com/zh-cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "medium",
    "overallScore": 58,
    "confidence": "C",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 63,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      14
    ],
    "bidPackages": [
      "混凝与沉淀设备包"
    ],
    "equipmentLists": [
      "1. 混合与絮凝设备\n   - 管道混合器（静态/动态）  \n   - 网格/折板絮凝池装置  \n   - 机械搅拌机（变频调速）  \n2. 沉淀设备  \n   - 平流沉淀池刮泥机  \n   - 斜板/斜管沉淀装置（PP材质）  \n   - 沉淀池排泥阀及排泥泵  \n3. 气浮设备\n   - 溶气气浮机（DAF）  \n   - 溶气释放器（GTV系列）  \n   - 空压机及溶气罐"
    ],
    "procurementStrategies": [
      "*分项采购*：\n“空压机”单独招标"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1871年，总部位于美国北卡罗来纳州戴维森市（Davidson, North Carolina）。\n企业定位：\n全球领先的多元化工业公司，专注于压缩空气系统、动力工具、流体处理设备及物料吊装设备，致力于通过技术创新提升工业效率与可持续性。2024年员工超1万人，年营收超150亿欧元（不同年份数据差异较大）。\n核心品牌：包括英格索兰（Ingersoll Rand®）、冷王（Thermo King®）、特灵（Trane®）、Club Car®等，服务领域涵盖航空航天、食品饮料、石油天然气、建筑等全球行业。\n在华发展：\n1922年进入中国市场，1987年成立上海英格索兰压缩机有限公司，2009年在江苏吴江建立亚太区最大生产基地，2012年扩建太仓研发中心。参与北京奥运会、上海世博会等重大项目。"
    ],
    "mainProducts": [
      "※主要经营产品：\n压缩机系统：\n无油螺杆压缩机、离心式压缩机、活塞式压缩机，适用于汽车修理、食品制药、工业制造等领域。\n动力工具：\n气动冲击工具、电动拧紧工具、工业葫芦及吊装设备，应用于装配线、采矿及建筑行业。\n流体处理设备：\n隔膜泵、齿轮泵（如ARO品牌），用于化学品转移、油漆调配等场景。\n物料吊装与运输：\n绞车、轨道系统及温控解决方案（冷王品牌），服务于运输制冷及工业吊装需求。"
    ],
    "addresses": [
      "上海总部：闵行区沪闵路5600号（上海英格索兰压缩机有限公司）。\n\n生产基地：江苏吴江（亚太最大工厂）、太仓研发中心"
    ],
    "contactDetails": "联系电话：\n上海公司服务热线：021-3466 5187（支持7×24小时咨询）\n区域销售热线：1391746064、13391146044（配件订购及技术服务）\n中国区官网：https://www.ingersollrand.com/zh-cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-012",
    "supplierCode": "SUP-KNG-202607-012",
    "supplierName": "广州千叶水设备公司旗下品牌（AQUA爱克）",
    "englishName": "Guangzhou AQUA Water Equipment Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品系列： 泳池循环设备：ALB系列大流量水泵、AP系列专利水泵、ALK节能水泵（比普通泵节能50%）。 消毒与监控设备： 中压紫外线杀菌器",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "aquaaike@163.com",
    "phone": "电话:020-32583997/13825089207",
    "website": "https://www.aquapool.cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      15,
      21
    ],
    "bidPackages": [
      "过滤设备包",
      "消毒设备包"
    ],
    "equipmentLists": [
      "1. 过滤主体设备 \n   - V型滤池（含滤板、滤头、滤料）  \n   - 活性炭过滤器（罐体+活性炭）  \n   - 石英砂过滤器  \n2. 反冲洗系统  \n   - 反冲洗水泵（高压离心泵）  \n   - 反冲洗风机（罗茨风机）  \n   - 气水联合反冲洗装置  \n3. 配套设备\n   - 滤池水位控制器  \n   - 滤料装卸设备（起重机+抓斗）",
      "1. 消毒主体设备\n   - 次氯酸钠发生器（或液氯投加系统）  \n   - 臭氧发生器（备用消毒）  \n   - 紫外线消毒器（中压/低压）  \n2. 配套系统 \n   - 消毒剂储存罐（耐腐蚀材质）  \n   - 加氯机及余氯在线监测仪  \n   - 臭氧接触池（不锈钢/混凝土）  \n3. 安全设备 \n   - 氯气泄漏报警装置  \n   - 应急中和系统（硫代硫酸钠投加装置）"
    ],
    "procurementStrategies": [
      "*核心捆绑采购*：\n组合设备：滤池 + 反冲洗系统 + 反渗透主机（由过滤技术厂商集成供应，需高精度过滤技术）\n\n优势：避免反冲洗压力与滤池设计不匹配",
      "*主设备集中采购*：\n组合设备：次氯酸钠发生器 + 紫外线消毒器（适配互补消毒），选择专精企业\n\n优势：满足多重消毒需求，减少药剂残留风险"
    ],
    "strengths": [
      "滤池 + 反冲洗泵阀一体化设计，精密过滤技术（脱盐率99.5%），适配紫外线消毒集成",
      "中压紫外线杀菌器（国际认证），支持水质监测联动"
    ],
    "introductions": [
      "成立时间：1999年，总部位于广州，是专业研发、生产和销售泳池、水上乐园、温泉SPA、海洋馆维生系统等水处理设备的知名品牌。\n企业定位：\n国家级高新技术企业，通过ISO 9001、ISO 14001、ISO 45001国际管理体系认证，拥有60+项行业专利。\n产品覆盖循环过滤、消毒清洁、恒温加热、除湿制冷等领域，累计水泵出货量超150万台，服务案例超10万+。\n生产规模：\n在广州、浙江等地拥有约4万平方的产研基地，2023年新增广东爱克节能设备有限公司作为空气源热泵生产基地，通过国家高新技术企业认证。"
    ],
    "mainProducts": [
      "※核心产品系列：\n泳池循环设备：ALB系列大流量水泵、AP系列专利水泵、ALK节能水泵（比普通泵节能50%）。\n※消毒与监控设备：\n中压紫外线杀菌器、臭氧发生器、联网型水质监控仪（AUT系列）。\n※恒温与除湿设备：\n三集一体恒温除湿热泵（集除湿、恒温、热能回收等功能于一体）。\n※过滤与加热设备：\n过滤砂缸、空气源热泵、海水专用养殖热泵"
    ],
    "addresses": [
      "地址:广州市广园中路65-69号建兴大厦"
    ],
    "contactDetails": "电话:020-32583997/13825089207\n微信号:AQUA pool\n邮箱:aquaaike@163.com\n主官网：https://www.aquapool.cn/",
    "notes": []
  },
  {
    "id": "SUP-KNG-013",
    "supplierCode": "SUP-KNG-202607-013",
    "supplierName": "东莞市粤戴水处理设备有限公司",
    "englishName": "Dongguan Yuedai Water Treatment Equipment Co., Ltd（英译）",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 反渗透设备、去离子水设备、实验室高纯水机、工业纯水系统、井水处理系统、直饮水设备、家用净水器、软化器等。 配套服务：车用尿素液设备、",
    "contact": "蔡洪青",
    "whatsapp": "待补全",
    "email": "zjxsccj@qq.com",
    "phone": "固定电话：0769-28638971；手机：15017391609（关联蔡洪青号码）",
    "website": "",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 92,
    "deliveryRisk": "medium",
    "overallScore": 90,
    "confidence": "A",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 100,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      16
    ],
    "bidPackages": [
      "过滤设备包"
    ],
    "equipmentLists": [
      "1. 过滤主体设备 \n   - V型滤池（含滤板、滤头、滤料）  \n   - 活性炭过滤器（罐体+活性炭）  \n   - 石英砂过滤器  \n2. 反冲洗系统  \n   - 反冲洗水泵（高压离心泵）  \n   - 反冲洗风机（罗茨风机）  \n   - 气水联合反冲洗装置  \n3. 配套设备\n   - 滤池水位控制器  \n   - 滤料装卸设备（起重机+抓斗）"
    ],
    "procurementStrategies": [
      "*核心捆绑采购*：\n组合设备：滤池 + 反冲洗系统 + 反渗透主机（由过滤技术厂商集成供应，需高精度过滤技术）\n\n优势：避免反冲洗压力与滤池设计不匹配"
    ],
    "strengths": [
      "低压反渗透系统（南方牌不锈钢离心泵），适配高纯水需求"
    ],
    "introductions": [
      "成立时间：2016年11月23日，注册资本500万元人民币，法人代表为蔡洪青（持股99%）。\n企业定位：\n专注于水处理设备及配件的研发、生产与销售，涵盖反渗透设备、纯化水设备、实验室超纯水机等产品，应用于化工、电子、电镀、电池、电力等行业。\n拥有自主知识产权的产品系列（如YD系列、SA系列实验室超纯水机），注重技术创新与环保解决方案，致力于为客户提供安装、维护等全流程服务。\n生产规模：员工5-10人，年交易额101-500万元，生产车间配备手工焊接等工艺。"
    ],
    "mainProducts": [
      "※核心产品：\n反渗透设备、去离子水设备、实验室高纯水机、工业纯水系统、井水处理系统、直饮水设备、家用净水器、软化器等。\n配套服务：车用尿素液设备、自动化设备及环保设备安装维护。"
    ],
    "addresses": [
      "地址：广东省东莞市万江街道黄粘洲中路二横巷12号101房"
    ],
    "contactDetails": "固定电话：0769-28638971\n手机：15017391609（关联蔡洪青号码）\n邮箱：zjxsccj@qq.com 或 zjxsccj@126.com\n官网：无",
    "notes": []
  },
  {
    "id": "SUP-KNG-014",
    "supplierCode": "SUP-KNG-202607-014",
    "supplierName": "重庆绿健水处理设备有限公司",
    "englishName": "Chongqing Lüjian Water Treatment Equipment Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "涵盖工业净水设备、污水处理系统、反渗透设备、水处理配套设备等",
    "contact": "业务部",
    "whatsapp": "待补全",
    "email": "service@plc18.com",
    "phone": "联系电话：023-8307196",
    "website": "http://www.plc18.com/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 92,
    "deliveryRisk": "medium",
    "overallScore": 90,
    "confidence": "A",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 100,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      17
    ],
    "bidPackages": [
      "过滤设备包"
    ],
    "equipmentLists": [
      "1. 过滤主体设备 \n   - V型滤池（含滤板、滤头、滤料）  \n   - 活性炭过滤器（罐体+活性炭）  \n   - 石英砂过滤器  \n2. 反冲洗系统  \n   - 反冲洗水泵（高压离心泵）  \n   - 反冲洗风机（罗茨风机）  \n   - 气水联合反冲洗装置  \n3. 配套设备\n   - 滤池水位控制器  \n   - 滤料装卸设备（起重机+抓斗）"
    ],
    "procurementStrategies": [
      "*核心捆绑采购*：\n组合设备：滤池 + 反冲洗系统 + 反渗透主机（由过滤技术厂商集成供应，需高精度过滤技术）\n\n优势：避免反冲洗压力与滤池设计不匹配"
    ],
    "strengths": [
      "反渗透系统 + EDI模块，反渗透设备（0.25-20吨/小时），能耗低且模块化设计"
    ],
    "introductions": [
      "业务范围：\n公司专注于水处理设备的研发、生产与销售，具体产品和服务未在搜索结果中详细列出，但结合名称推测可能涉及工业或民用净水、污水处理设备等领域。"
    ],
    "mainProducts": [
      "涵盖工业净水设备、污水处理系统、反渗透设备、水处理配套设备等"
    ],
    "addresses": [
      "待更新"
    ],
    "contactDetails": "联系电话：023-8307196\n邮箱：service@plc18.com\n网址：http://www.plc18.com/",
    "notes": []
  },
  {
    "id": "SUP-KNG-015",
    "supplierCode": "SUP-KNG-202607-015",
    "supplierName": "本地采购（前期经验水厂指定）",
    "englishName": "",
    "countryCode": "CN",
    "countryRegion": "刚果金",
    "category": "本地采购候选",
    "mainScope": "1. 过滤主体设备 - V型滤池（含滤板、滤头、滤料） - 活性炭过滤器（罐体+活性炭） - 石英砂过滤器 2. 反冲洗系统 - 反冲洗水泵（高",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "待补全",
    "website": "",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "high",
    "overallScore": 58,
    "confidence": "D",
    "aiEvaluation": "采购策略占位记录，需补充具体本地供应商后人工确认。",
    "riskLevel": "high",
    "status": "待复核",
    "dataCompleteness": 0,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      18
    ],
    "bidPackages": [
      "过滤设备包"
    ],
    "equipmentLists": [
      "1. 过滤主体设备 \n   - V型滤池（含滤板、滤头、滤料）  \n   - 活性炭过滤器（罐体+活性炭）  \n   - 石英砂过滤器  \n2. 反冲洗系统  \n   - 反冲洗水泵（高压离心泵）  \n   - 反冲洗风机（罗茨风机）  \n   - 气水联合反冲洗装置  \n3. 配套设备\n   - 滤池水位控制器  \n   - 滤料装卸设备（起重机+抓斗）"
    ],
    "procurementStrategies": [
      "*滤料分项采购*：  \n（石英砂、活性炭）选择本地供应商降低成本"
    ],
    "strengths": [],
    "introductions": [],
    "mainProducts": [],
    "addresses": [],
    "contactDetails": "",
    "notes": []
  },
  {
    "id": "SUP-KNG-016",
    "supplierCode": "SUP-KNG-202607-016",
    "supplierName": "山东龙安泰环保科技有限公司",
    "englishName": "Shandong Longantai Environmental Protection Technology Co., Ltd（英译）",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 水处理设备：微电解催化氧化反应器、臭氧催化氧化反应器、多相催化芬顿反应器、BDD金刚石电催化氧化设备等。 催化剂及填料：臭氧催化剂、",
    "contact": "郭先生（业务经理，手机18906461810）",
    "whatsapp": "待补全",
    "email": "LAT@longantai.com",
    "phone": "销售热线：0536-2177888 / 13305362086；客服热线：0536-2177999",
    "website": "http://www.sdlongantai.cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 92,
    "deliveryRisk": "medium",
    "overallScore": 90,
    "confidence": "A",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 100,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      19
    ],
    "bidPackages": [
      "消毒设备包"
    ],
    "equipmentLists": [
      "1. 消毒主体设备\n   - 次氯酸钠发生器（或液氯投加系统）  \n   - 臭氧发生器（备用消毒）  \n   - 紫外线消毒器（中压/低压）  \n2. 配套系统 \n   - 消毒剂储存罐（耐腐蚀材质）  \n   - 加氯机及余氯在线监测仪  \n   - 臭氧接触池（不锈钢/混凝土）  \n3. 安全设备 \n   - 氯气泄漏报警装置  \n   - 应急中和系统（硫代硫酸钠投加装置）"
    ],
    "procurementStrategies": [
      "*主设备集中采购*：\n组合设备：次氯酸钠发生器 + 紫外线消毒器（适配互补消毒），选择专精企业\n\n优势：满足多重消毒需求，减少药剂残留风险"
    ],
    "strengths": [
      "臭氧发生器 + 应急中和系统，臭氧发生器专利技术，适用于高盐废水"
    ],
    "introductions": [
      "成立时间：2005年，总部位于山东省潍坊市，是国家高新技术企业、专精特新“小巨人”企业。\n企业定位：\n专注于工业废水处理、高盐废水治理、废水循环回用及河湖水质提升，提供水处理催化剂、关键设备及整体解决方案。\n集研发、生产、设计、工程建设和运营于一体，拥有70多项国家发明专利，服务团队超200人，累计服务客户覆盖化工、电子、电力等多个行业。\n行业地位：国内高级催化氧化领域的龙头企业"
    ],
    "mainProducts": [
      "※核心产品：\n水处理设备：微电解催化氧化反应器、臭氧催化氧化反应器、多相催化芬顿反应器、BDD金刚石电催化氧化设备等。\n催化剂及填料：臭氧催化剂、微电解催化剂、芬顿催化剂、除氟/除磷填料、活性氧化铝等。\n配套系统：智慧水务控制系统、次氯酸发生器、紫外消杀系统、磁混凝沉淀系统等。\n※技术特色：\n聚焦高浓度难降解废水处理，技术涵盖催化氧化、电化学、膜分离等领域，注重节能降耗与资源回收"
    ],
    "addresses": [
      "办公地址：山东省潍坊市北海路4931号财富国际商务大厦23楼\n生产基地：山东省潍坊市峡山区高新项目区工业一街9号"
    ],
    "contactDetails": "销售热线：0536-2177888 / 13305362086\n客服热线：0536-2177999\n邮箱：LAT@longantai.com\n官网：http://www.sdlongantai.cn/",
    "notes": []
  },
  {
    "id": "SUP-KNG-017",
    "supplierCode": "SUP-KNG-202607-017",
    "supplierName": "霍尼韦尔（Honeywell）",
    "englishName": "Honeywell International Inc",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品 航空航天： 飞机推进系统、辅助动力装置、航空电子设备、卫星通信系统等，服务全球6000多家航空客户（如波音飞机30%组件由霍尼韦尔",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "中国区服务热线：400-842-8487（工作日9:00–17:00）；区域电话：；中国区服务热线：400-842-8487（工作日9:00–17:00）",
    "website": "https://www.honeywell.com.cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "medium",
    "overallScore": 58,
    "confidence": "C",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 63,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      22,
      29
    ],
    "bidPackages": [
      "消毒设备包",
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 消毒主体设备\n   - 次氯酸钠发生器（或液氯投加系统）  \n   - 臭氧发生器（备用消毒）  \n   - 紫外线消毒器（中压/低压）  \n2. 配套系统 \n   - 消毒剂储存罐（耐腐蚀材质）  \n   - 加氯机及余氯在线监测仪  \n   - 臭氧接触池（不锈钢/混凝土）  \n3. 安全设备 \n   - 氯气泄漏报警装置  \n   - 应急中和系统（硫代硫酸钠投加装置）",
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "※安全设备独立标段※：\n需符合安监要求",
      "*系统集成招标*\n组合设备：PLC + SCADA + 监测仪表（由自动化厂商整体设计,需通信协议统一）\n\n优势：确保通信协议统一，避免数据孤岛"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1885年（由Albert Butz创立），1999年与联信公司（AlliedSignal）合并后沿用霍尼韦尔名称。\n企业定位：\n全球领先的多元化高科技制造企业，专注于自动化、未来航空、能源转型及智能建筑等领域。\n2021年营业额约354.66亿美元（网页10），全球员工约11.4万人，中国员工超1.2万名。\n业务覆盖航空航天、工业控制、特殊材料、交通系统四大板块，产品应用于航空电子、楼宇自动化、涡轮增压器、环保制冷剂等。\n在华发展：\n1935年在上海设立首个经销机构，1996年成立霍尼韦尔（中国）有限公司，总部位于上海自贸试验区环科路555弄1号楼10层。\n中国投资超10亿美元，设立20余家子公司及合资企业，参与南水北调、北京大兴机场等重大项目。"
    ],
    "mainProducts": [
      "※主要经营产品\n航空航天：\n飞机推进系统、辅助动力装置、航空电子设备、卫星通信系统等，服务全球6000多家航空客户（如波音飞机30%组件由霍尼韦尔提供）。\n自动化控制：\n楼宇智能系统、工业传感器、安防设备、过程控制系统（如炼油厂自动化解决方案）。\n特殊材料：\n环保制冷剂、高性能纤维、食品包装薄膜、尼龙树脂等。\n交通系统：\n涡轮增压器、汽车火花塞、刹车材料，全球市场份额领先。\n智能建筑与能源：\n智慧楼宇管理系统、节能解决方案、空气净化设备等。"
    ],
    "addresses": [
      "中国总部：\n上海市自由贸易试验区环科路555弄1号楼10层\n其他分支机构：\n北京：朝阳区霄云路26号鹏润大厦17层\n上海：遵义路100号虹桥上海城B座23层\n重庆、天津等地设办事处及生产基地"
    ],
    "contactDetails": "中国区服务热线：400-842-8487（工作日9:00–17:00）\n区域电话：\n北京：86-10-64103000\n上海：86-21-22196888\n重庆：86-23-67882288\n中国区官网为 https://www.honeywell.com.cn\n中国区服务热线：400-842-8487（工作日9:00–17:00）\n区域电话：\n北京：86-10-64103000\n上海：86-21-22196888\n重庆：86-23-67882288",
    "notes": []
  },
  {
    "id": "SUP-KNG-018",
    "supplierCode": "SUP-KNG-202607-018",
    "supplierName": "博世（中国）投资有限公司",
    "englishName": "Bosch (China) Investment Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 汽车与智能交通：汽车电子驱动系统、ESP电子稳定程序、自动驾驶技术、动力总成解决方案等。 工业技术：传动与控制技术、工业自动化设",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "中国区客服热线：400-831-0669（工作日9:00-18:00）；电动工具服务热线：400-826-8484（杭州公司）",
    "website": "https://www.bosch.com.cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "medium",
    "overallScore": 58,
    "confidence": "C",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 63,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      23
    ],
    "bidPackages": [
      "消毒设备包"
    ],
    "equipmentLists": [
      "1. 消毒主体设备\n   - 次氯酸钠发生器（或液氯投加系统）  \n   - 臭氧发生器（备用消毒）  \n   - 紫外线消毒器（中压/低压）  \n2. 配套系统 \n   - 消毒剂储存罐（耐腐蚀材质）  \n   - 加氯机及余氯在线监测仪  \n   - 臭氧接触池（不锈钢/混凝土）  \n3. 安全设备 \n   - 氯气泄漏报警装置  \n   - 应急中和系统（硫代硫酸钠投加装置）"
    ],
    "procurementStrategies": [
      "※安全设备独立标段※：\n需符合安监要求"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1886年由罗伯特·博世（Robert Bosch）在德国斯图加特创立，最初为“精密机械和电气工程车间”，现为全球领先的技术与服务供应商。\n企业定位：\n业务涵盖汽车与智能交通技术、工业技术、消费品、能源与建筑技术四大领域，以创新技术（如物联网、人工智能）推动可持续发展。\n全球规模：截至2023年，集团员工约42.9万人，年销售额916亿欧元，研发投入73亿欧元，在近60个国家拥有468家子公司。\n在华发展：1909年进入中国，2022年在华销售额达1,323亿人民币，拥有59家公司和超55,000名员工，中国市场为博世全球最大单一市场。"
    ],
    "mainProducts": [
      "※主要经营产品：\n汽车与智能交通：汽车电子驱动系统、ESP电子稳定程序、自动驾驶技术、动力总成解决方案等。\n工业技术：传动与控制技术、工业自动化设备、电动工具（如博世电钻）。\n消费品：家电（冰箱、洗衣机、洗碗机）、安防系统（视频监控、门禁系统）、智能家居解决方案。\n能源与建筑技术：热泵系统、太阳能技术、建筑智能化管理系统。"
    ],
    "addresses": [
      "博世（中国）投资有限公司地址：上海市长宁区福泉北路333号，邮编200335"
    ],
    "contactDetails": "中国区客服热线：400-831-0669（工作日9:00-18:00）\n电动工具服务热线：400-826-8484（杭州公司）\n中国区官网：https://www.bosch.com.cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-019",
    "supplierCode": "SUP-KNG-202607-019",
    "supplierName": "南方泵业股份有限公司",
    "englishName": "Nanfang Pump Industry Co.,Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： CDM（F）轻型立式多级离心泵、SS高效静音水务专用泵、TD管道循环泵、NIS系列端吸离心泵、PQ不锈钢喷泉专用潜水电泵等。 成套智",
    "contact": "刘经理",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "手机：17712658188（微信同号）；销售合作电话：4001 077 588（苏州瑞龙环保科技有限公司，南方泵业销售商）",
    "website": "https://www.cnppump.cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      24
    ],
    "bidPackages": [
      "泵阀与管道设备包"
    ],
    "equipmentLists": [
      "1. 泵类设备  \n   - 清水输送泵（离心泵）  \n   - 增压泵（多级离心泵）  \n   - 循环水泵（变频控制）  \n2. 阀门类设备 \n   - 电动/气动蝶阀（DN150-DN1200）  \n   - 止回阀、闸阀、球阀  \n   - 减压阀及安全阀  \n3. 管道及配件 \n   - 不锈钢/球墨铸铁输水管  \n   - 法兰、弯头、三通等管件  \n   - 管道防腐保温材料"
    ],
    "procurementStrategies": [
      "*泵阀捆绑采购*：\n组合设备：高压泵 + 配套阀门（由同一厂商提供，确保密封性）\n\n优势：降低泄漏风险，简化安装流程。"
    ],
    "strengths": [
      "清水泵 + 止回阀国产化方案，性价比高"
    ],
    "introductions": [
      "成立时间：1991年，总部位于杭州，是国有控股上市公司南方中金环境股份有限公司（股票代码：300145）旗下最大子公司。\n企业定位：专注于节能泵研发、制造、销售，致力于成为全球节能泵及解决方案领军者，连续6年入围中国机械工业百强。\n核心产品：\n冲压焊接多级离心泵（2021年获评“国家级制造业单项冠军产品”）。轻型立式多级离心泵销量亚洲第一、全球前二（弗若斯特沙利文认证）。\n生产与研发：\n年产泵类产品100万台套，技术研发人员300余人，销售团队1000余人，覆盖300多个销售网点。通过ISO质量体系认证，拥有国家级企业技术中心，并获浙江制造“品字标”认证。"
    ],
    "mainProducts": [
      "※核心产品：\nCDM（F）轻型立式多级离心泵、SS高效静音水务专用泵、TD管道循环泵、NIS系列端吸离心泵、PQ不锈钢喷泉专用潜水电泵等。\n成套智慧供水与排水设备、智能变频泵（如CDME立式多级智能变频泵、TDE立式单级智能变频泵）。"
    ],
    "addresses": [
      "总部地址：杭州市余杭区仁和镇\n其他分支机构与销售网点覆盖全国300多个城市"
    ],
    "contactDetails": "手机：17712658188（微信同号）\n销售合作电话：4001 077 588（苏州瑞龙环保科技有限公司，南方泵业销售商）\n官方主网站： https://www.cnppump.cn/",
    "notes": []
  },
  {
    "id": "SUP-KNG-020",
    "supplierCode": "SUP-KNG-202607-020",
    "supplierName": "天长市龙源泵阀有限公司",
    "englishName": "Tianchang LongQuan Pump Valve Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 泵阀、液化喷射器、机械密封、酒精泵、IPD胚芽旋流淀粉泵、纸浆泵、真空泵、自吸泵、渣浆泵机、流程泵等。 水泵配件及定制化解决方案。",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "固定电话：0550-7703658258；手机：13805506909、13685503115（李经理）",
    "website": "http://www.ahlybf.com/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      26
    ],
    "bidPackages": [
      "泵阀与管道设备包"
    ],
    "equipmentLists": [
      "1. 泵类设备  \n   - 清水输送泵（离心泵）  \n   - 增压泵（多级离心泵）  \n   - 循环水泵（变频控制）  \n2. 阀门类设备 \n   - 电动/气动蝶阀（DN150-DN1200）  \n   - 止回阀、闸阀、球阀  \n   - 减压阀及安全阀  \n3. 管道及配件 \n   - 不锈钢/球墨铸铁输水管  \n   - 法兰、弯头、三通等管件  \n   - 管道防腐保温材料"
    ],
    "procurementStrategies": [
      "*泵阀捆绑采购*：\n组合设备：高压泵 + 配套阀门（由同一厂商提供，确保密封性）\n\n优势：降低泄漏风险，简化安装流程。"
    ],
    "strengths": [
      "耐腐蚀泵（单价2400元起），适配预算控制"
    ],
    "introductions": [
      "天长市龙源泵阀有限公司成立于2013年4月12日，总部位于安徽省天长市永丰工业园，是一家专业生产泵阀、液化喷射器、机械密封及水泵配件的高新技术企业。公司以“科技为先导，客户价值为依托”为核心理念，产品广泛应用于酿酒、制药、石油、化工、造纸、冶金、电力、食品、环保等行业。\n技术实力：拥有先进的生产设备、检测设备和研发团队，注重产品质量与服务，致力于成为国内泵阀行业的领军企业。"
    ],
    "mainProducts": [
      "※核心产品：\n泵阀、液化喷射器、机械密封、酒精泵、IPD胚芽旋流淀粉泵、纸浆泵、真空泵、自吸泵、渣浆泵机、流程泵等。\n水泵配件及定制化解决方案。"
    ],
    "addresses": [
      "地址：安徽省天长市永丰街道永丰工业园"
    ],
    "contactDetails": "固定电话：0550-7703658258\n手机：13805506909、13685503115（李经理）\n官网：http://www.ahlybf.com/",
    "notes": []
  },
  {
    "id": "SUP-KNG-021",
    "supplierCode": "SUP-KNG-202607-021",
    "supplierName": "新兴铸管股份有限公司",
    "englishName": "Xinxing Ductile Iron Pipes Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品系列： 球墨铸铁管及管件：DN80～DN3000mm，适用于供水、输气，防腐技术全球领先。 钢材：热轧带肋钢筋、圆钢及优特钢，年产能63",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "xxzg0778@163.com",
    "phone": "总部电话：0310-5792011（邯郸）、010-65168778（北京）",
    "website": "http://www.xinxing-pipes.com",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      27
    ],
    "bidPackages": [
      "泵阀与管道设备包"
    ],
    "equipmentLists": [
      "1. 泵类设备  \n   - 清水输送泵（离心泵）  \n   - 增压泵（多级离心泵）  \n   - 循环水泵（变频控制）  \n2. 阀门类设备 \n   - 电动/气动蝶阀（DN150-DN1200）  \n   - 止回阀、闸阀、球阀  \n   - 减压阀及安全阀  \n3. 管道及配件 \n   - 不锈钢/球墨铸铁输水管  \n   - 法兰、弯头、三通等管件  \n   - 管道防腐保温材料"
    ],
    "procurementStrategies": [
      "*管道分标段*：\n（DN600以上）单独招标"
    ],
    "strengths": [],
    "introductions": [
      "成立背景：\n公司前身为1971年成立的中国人民解放军第二六七二工程指挥部（军队钢铁厂），1996年改制为国有独资有限公司，1997年在深交所上市（股票代码：000778）。现为国务院国资委监管的中央企业新兴际华集团核心成员。\n企业定位：\n全球球墨铸铁管龙头企业：离心球墨铸铁管产能180万吨，国内市场占有率46%，出口比例30%，产品覆盖120多个国家，技术水平和市场份额全球领先。\n多元化布局：形成铸管、钢材、特种钢管、钢格板、锻件等七大产品系列，年产能超800万吨金属制品，总资产超511亿元（2013年数据）。\n荣誉与资质：获“全国质量效益型先进企业”“国家知识产权示范企业”“亚洲品牌500强”等称号，主持制定多项国际及国家标准（如ISO10804、GB/T13295）。"
    ],
    "mainProducts": [
      "※核心产品系列：\n球墨铸铁管及管件：DN80～DN3000mm，适用于供水、输气，防腐技术全球领先。\n钢材：热轧带肋钢筋、圆钢及优特钢，年产能630万吨，获冶金产品实物质量金杯奖。\n特种钢管：双金属复合管、高合金钢管，年产能18万吨，用于石油石化、电力行业。\n钢格板：年产能8万吨，应用于工业平台、市政设施。\n钢塑复合管：年产能300万米，解决钢塑脱胶难题，适用于高层建筑给水。\n锻件与铸件：年产能4万吨，用于汽车、风电、化工等领域。"
    ],
    "addresses": [
      "总部地址：河北省武安市上洛阳村北（2672厂区）\n生产基地：分布于河北邯郸、安徽芜湖、新疆巴州、湖北黄石、湖南桃江、四川崇州等地。\n分支机构：\n北京办事处：朝阳区东三环中路7号北京财富中心A座3005室。\n销售分公司：全国17个销售分公司，海外12个办事处及2个子公司。"
    ],
    "contactDetails": "总部电话：0310-5792011（邯郸）、010-65168778（北京）\n销售咨询：0310-60660684\n官方邮箱：xxzg0778@163.com\n官网：http://www.xinxing-pipes.com",
    "notes": []
  },
  {
    "id": "SUP-KNG-022",
    "supplierCode": "SUP-KNG-202607-022",
    "supplierName": "西门子股份公司（SIEMENS）",
    "englishName": "Siemens Aktiengesellschaft（简称Siemens AG）",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 工业自动化： 包括自动化系统、数控设备、工业软件（如Mendix低代码平台）、传感器及物联网解决方案。 智能基础设施： 智能楼宇",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "电话：+86 (10) 6476 8888（北京总部）；客服热线：400-842-8487（技术支持与售后服务）",
    "website": "https://www.siemens.com/cn/zh.html",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      28
    ],
    "bidPackages": [
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "*系统集成招标*\n组合设备：PLC + SCADA + 监测仪表（由自动化厂商整体设计,需通信协议统一）\n\n优势：确保通信协议统一，避免数据孤岛"
    ],
    "strengths": [
      "Simatic PLC + WinCC SCADA，全球工业自动化龙头"
    ],
    "introductions": [
      "成立时间：1847年，由维尔纳·冯·西门子在德国柏林创立。\n企业定位：\n全球领先的科技公司，专注于工业、基础设施、交通和医疗领域，致力于通过数字化和可持续发展推动产业变革。\n2024年全球员工约31.2万人，总营收达759亿欧元，净收益90亿欧元，业务覆盖190多个国家。\n中国业务始于1872年，目前在中国拥有超1.2万名员工，参与南水北调、北京大兴机场等重大项目。\n业务架构：\n主要分为数字化工业、智能基础设施、交通、医疗（西门子医疗）和能源（西门子能源）五大板块。"
    ],
    "mainProducts": [
      "主要经营产品：\n工业自动化：\n包括自动化系统、数控设备、工业软件（如Mendix低代码平台）、传感器及物联网解决方案。\n智能基础设施：\n智能楼宇系统、电网设备、能源管理解决方案及数据中心技术。\n交通解决方案：\n轨道交通设备（如高铁、地铁）、铁路自动化系统及智能交通管理平台。\n医疗设备：\n影像诊断系统（如CT、MRI）、实验室诊断设备及数字化医疗解决方案（通过子公司西门子医疗）。\n能源技术：\n燃气轮机、可再生能源设备（如风电）、输配电系统（通过西门子能源）。"
    ],
    "addresses": [
      "中国总部：\n北京市朝阳区望京中环南路7号，邮编100102。\n分支机构：\n在上海市、广州市等地设有办事处及研发中心（如深圳光明科学城数字化工业创新中心）"
    ],
    "contactDetails": "电话：+86 (10) 6476 8888（北京总部）\n客服热线：400-842-8487（技术支持与售后服务）\n中国区官网：https://www.siemens.com/cn/zh.html",
    "notes": []
  },
  {
    "id": "SUP-KNG-023",
    "supplierCode": "SUP-KNG-202607-023",
    "supplierName": "深圳市汇川技术股份有限公司",
    "englishName": "Shenzhen Inovance Technology Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 工业自动化： 核心产品：变频器（MD系列、IS系列）、伺服系统、PLC/HMI、工业视觉系统、传感器、机器视觉等。 解决方案：提",
    "contact": "陈振海（数字化事业部联系人，电话：18606279856）",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "总部电话：0755-83185787（总机）",
    "website": "https://www.inovance.com/cn/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      30
    ],
    "bidPackages": [
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "*系统集成招标*\n组合设备：PLC + SCADA + 监测仪表（由自动化厂商整体设计,需通信协议统一）\n\n优势：确保通信协议统一，避免数据孤岛"
    ],
    "strengths": [
      "伺服系统与变频器技术领先，性价比高"
    ],
    "introductions": [
      "成立时间：2003年4月，总部位于广东深圳，2010年9月在深交所创业板上市（股票代码：300124）。\n企业定位：\n中国工业自动化控制领域的龙头企业，专注于“信息层、控制层、驱动层、执行层、传感层”核心技术，覆盖工业自动化、新能源、轨道交通、工业机器人等领域。\n2023年员工超2.3万人，研发投入占比超10%，拥有超2,000项专利（含338项发明专利）。\n业务板块：通用自动化（占营收约50%）、智慧电梯、新能源汽车电驱系统、工业机器人、轨道交通牵引系统。\n市场地位：\n伺服系统、低压变频器、小型PLC等产品市场份额位居国内前三，新能源汽车电驱系统在第三方供应商中排名第一。\n入选“2022胡润中国500强民营企业”第42位，市值约1,300亿元（2023年数据）。"
    ],
    "mainProducts": [
      "※主要经营产品：\n工业自动化：\n核心产品：变频器（MD系列、IS系列）、伺服系统、PLC/HMI、工业视觉系统、传感器、机器视觉等。\n解决方案：提供“PLC+伺服+机器人”打包方案及行业定制化解决方案（如锂电、光伏、3C制造等）。\n新能源汽车：\n-电驱系统：电机控制器、驱动电机、多合一电驱总成（如三合一、五合一系统）。\n-电源系统：车载充电机（OBC）、DC/DC转换器、电源总成。\n智慧电梯：电梯控制系统（一体化控制器）、人机界面、门系统、电梯物联网等电气大配套方案。\n轨道交通：牵引变流器、辅助变流器、牵引电机及智能运维系统。"
    ],
    "addresses": [
      "总部地址：广东省深圳市龙华区观湖街道鹭湖社区澜清二路6号汇川技术总部大厦1单元101\n其他分支机构：\n苏州、杭州、南京、上海、宁波、长春、香港等地设30余家分子公司，海外布局包括德国、法国、日本、瑞士等研发中心及办事处"
    ],
    "contactDetails": "总部电话：0755-83185787（总机）\n中国区官网：https://www.inovance.com/cn/",
    "notes": []
  },
  {
    "id": "SUP-KNG-024",
    "supplierCode": "SUP-KNG-202607-024",
    "supplierName": "国能智深控制技术有限公司",
    "englishName": "Beijing SP Zhishen Control Technology Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品系列： EDPF系列控制系统：包括EDPF-NT+分散控制系统（DCS）、EDPF-DEH汽轮机数字电液控制系统（DEH）、EDPF-F",
    "contact": "王珊（官网标注联系人）",
    "whatsapp": "待补全",
    "email": "e0032617@chnenergy.com.cn",
    "phone": "联系电话：；招标客服电话：010-86390893",
    "website": "http://c.gongkong.com",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 92,
    "deliveryRisk": "medium",
    "overallScore": 90,
    "confidence": "A",
    "aiEvaluation": "已从卡南加项目采购建议表导入，建议核验联系人及项目供货能力后再询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 100,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      31
    ],
    "bidPackages": [
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "*系统集成招标*\n组合设备：PLC + SCADA + 监测仪表（由自动化厂商整体设计,需通信协议统一）\n\n优势：确保通信协议统一，避免数据孤岛"
    ],
    "strengths": [
      "国产iDCS系统（自主可控），支持智能预警"
    ],
    "introductions": [
      "成立背景：\n国能智深成立于2002年，由国电科技环保集团股份有限公司和国网电力科学研究院共同投资组建，前身是中国电力科学研究院电厂自动化研究所和国电龙源电力工程有限责任公司。\n企业定位：\n专注于工业自动化系统的设计、制造及过程控制技术研发，尤其在分散控制系统（DCS）领域拥有完全自主知识产权，产品覆盖电力、化工、石油、冶金、煤矿等多个领域。\n国家级高新技术企业，多次承担国家“863”项目和国家级科研项目，入选国家级专精特新“小巨人”企业名单和国资委“科改示范行动”。\n技术成就：\n1987年率先研制国产分散控制系统，1992年推出国内首套DCS，2006年升级为EDPF-NT+系统，2023年发布融合人工智能的全国产智能DCS（iDCS），实现硬件和操作系统100%国产化。\n累计推广应用超1600台套产品和工程服务，在电力自动化领域市场份额领先。"
    ],
    "mainProducts": [
      "※核心产品系列：\nEDPF系列控制系统：包括EDPF-NT+分散控制系统（DCS）、EDPF-DEH汽轮机数字电液控制系统（DEH）、EDPF-FB现场总线控制系统（FCS）等。\n智能化系统：iDCS智能分散控制系统、核电仿真测试系统（EDPF-KCP/KCS）、全激励式仿真系统（EDPF-SU）。\n配套设备与软件：SOEGEN-256型SOE信号发生器、智能电源切换装置（EDPF-QPS）、高级应用优化控制软件包。"
    ],
    "addresses": [
      "总部地址：\n北京市昌平区北七家镇未来科技城英才北二街国电新能源技术研究院307楼（邮编：102211）。\n其他地址：\n北京市昌平区未来科学城英才北二街9号307号楼7716室（工商注册地址）\n海淀区西四环中路16号院1号楼13层1302室"
    ],
    "contactDetails": "联系电话：\n总机：010-56977999\n招标客服电话：010-86390893\n邮箱：e0032617@chnenergy.com.cn\n官网：http://c.gongkong.com › gdzs（暂打不开）",
    "notes": []
  },
  {
    "id": "SUP-KNG-025",
    "supplierCode": "SUP-KNG-202607-025",
    "supplierName": "华为技术有限公司",
    "englishName": "Huawei Technologies Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： ICT基础设施：5G/5G-A通信设备、光网络（OptiX系列）、数据中心解决方案（鲲鹏服务器、昇腾AI计算）。云计算服务（华为",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "待补全",
    "website": "",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "medium",
    "overallScore": 58,
    "confidence": "C",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 63,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      33
    ],
    "bidPackages": [
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "*仪表分项补充*\n“服务器与防火墙”选择IT专精厂商（、）"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1987年，由任正非在深圳创立，最初为通信设备销售代理，现为全球领先的ICT（信息与通信技术）基础设施和智能终端提供商。\n企业定位：\n业务覆盖运营商网络、企业解决方案、消费者终端、华为云及智能汽车等领域，服务全球30多亿人口。\n2023年销售收入超8,600亿元，研发投入占比20.8%（1,797亿元），全球员工约19.5万人，研发人员占比54.1%。\n技术创新：主导多项国际标准制定，拥有超15万件专利，鸿蒙系统（HarmonyOS）设备超10亿台，覆盖手机、汽车、智能家居等全场景。"
    ],
    "mainProducts": [
      "※主要经营产品：\nICT基础设施：5G/5G-A通信设备、光网络（OptiX系列）、数据中心解决方案（鲲鹏服务器、昇腾AI计算）。云计算服务（华为云）、存储设备（OceanStor系列）712。\n智能终端：手机（Mate/P系列）、平板、智能穿戴（手表、耳机）、智慧屏、全屋智能设备。鸿蒙操作系统（HarmonyOS）及开发者生态。\n行业解决方案：智慧城市、金融科技、智能交通、能源数字化（如智能电网、矿山解决方案）712。"
    ],
    "addresses": [
      "全球总部地址：广东省深圳市龙岗区坂田华为基地（注册地址）。\n国内分支机构：\n北京（朝阳区兆泰国际中心）、上海（虹口区北外滩来福士）、广州（环市东路花园大厦）等30余个城市设有办事处及研发中心"
    ],
    "contactDetails": "企业业务：400-822-9999（技术支持与售后服务）",
    "notes": []
  },
  {
    "id": "SUP-KNG-026",
    "supplierCode": "SUP-KNG-202607-026",
    "supplierName": "新华三技术有限公司",
    "englishName": "New H3C Technologies Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品线： 智能联接：交换机、路由器、无线局域网（WLAN）、物联网设备等，支持数据中心、园区网及广域网场景。 智慧计算：H3C与HPE品牌的",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "区域联系方式：；北京：010-83030601（电话）",
    "website": "https://www.h3c.com/cn/（主官网",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "medium",
    "overallScore": 58,
    "confidence": "C",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 63,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      34
    ],
    "bidPackages": [
      "自动化控制系统包"
    ],
    "equipmentLists": [
      "1. 核心控制设备 \n   - PLC控制柜（西门子/施耐德）  \n   - SCADA监控系统  \n   - 变频调速装置（ABB/西门子）  \n2. 监测仪表 \n   - 水质在线监测仪（余氯、浊度、pH、COD）  \n   - 流量计（电磁/超声波）  \n   - 压力/液位传感器  \n3. 网络与安全  \n   - 工业交换机及光纤通信设备  \n   - 数据存储服务器  \n   - 网络防火墙（工业级）"
    ],
    "procurementStrategies": [
      "*仪表分项补充*\n“服务器与防火墙”选择IT专精厂商（、）"
    ],
    "strengths": [],
    "introductions": [
      "成立背景：\n新华三是紫光集团旗下的核心企业，专注于提供数字化解决方案，覆盖“云-网-安-算-存-端”全产业链，致力于成为客户数字化转型的合作伙伴。公司前身为华为与3Com的合资企业，后整合成为独立的数字化技术领导者。\n企业定位：\n提供云计算、大数据、人工智能、工业互联网、5G、信息安全等一站式数字化解决方案，服务运营商、政府、金融、医疗等百行百业。\n作为HPE®服务器、存储和技术服务的中国独家提供商，拥有超过16,000项专利（90%为发明专利），研发人员占比超50%。\n市场地位：\n在多个领域市场份额领先，例如连续多年中国以太网交换机市场份额第二（31.1%）、企业网园区交换机市场份额第一（38.2%）。"
    ],
    "mainProducts": [
      "※核心产品线：\n智能联接：交换机、路由器、无线局域网（WLAN）、物联网设备等，支持数据中心、园区网及广域网场景。\n智慧计算：H3C与HPE品牌的服务器，覆盖通用计算、人工智能计算及边缘计算。\n智慧存储：全闪存存储、分布式存储及超融合系统，提供高性能数据管理方案。\n主动安全：零信任安全、云安全、数据安全解决方案，覆盖网络安全全生命周期。\n智能终端：商用PC、笔记本、显示器及智能家居设备。\n行业解决方案：包括智慧城市、工业互联网、医疗数字化、教育信息化等场景化应用。"
    ],
    "addresses": [
      "总部地址：北京市海淀区知春路7号院致真大厦22层，邮编：100191（中国北区主要办公地）\n其他分支机构：\n上海：浦东新区金科路2517号A栋\n广州：环市东路368号花园商业大厦9楼\n深圳：南山区科技园金融基地2栋6楼\n成都：锦江区东御街18号百扬大厦25楼"
    ],
    "contactDetails": "企业业务咨询：400-810-1315\n区域联系方式：\n北京：010-83030601（电话）\n上海：021-20321618、583148001\n深圳：0755-26585518\n中国区官网：https://www.h3c.com/cn/（主官网，涵盖产品、解决方案及服务信息）",
    "notes": []
  },
  {
    "id": "SUP-KNG-027",
    "supplierCode": "SUP-KNG-202607-027",
    "supplierName": "山东水龙王集团有限公司",
    "englishName": "Shandong Shuilongwang Group Co., Ltd（英译）",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品： 压力容器与换热设备：一二类压力容器、管壳式/板式换热器、凝结水回收装置、热网加热器等。 水处理设备：工业循环水处理设备、软化水设备、",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "sml1898@163.com",
    "phone": "联系电话：；临沂子公司电话：13705396977。",
    "website": "http://www.sdslwjt.com（暂打不开",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      36
    ],
    "bidPackages": [
      "污泥处理设备包"
    ],
    "equipmentLists": [
      "1. 污泥脱水设备\n   - 带式污泥脱水机  \n   - 离心式脱水机  \n   - 板框压滤机（备用）  \n2. 输送设备  \n   - 螺旋输送机  \n   - 污泥泵（螺杆泵）  \n3. 干化与处置 \n   - 污泥干化机（热风能）  \n   - 污泥料仓（防腐蚀材质）"
    ],
    "procurementStrategies": [
      "*脱水+干化成套采购*\n组合设备：脱水机 + 干化机（由污泥处理专精厂商提供，需减量化与资源化衔接）\n\n优势：实现污泥减量化与资源化衔接"
    ],
    "strengths": [
      "离心脱水机 + 热风干化低成本方案，物理法脱水设备（单价5600元起），成本可控"
    ],
    "introductions": [
      "成立背景：\n山东水龙王集团是国家级大型企业集团，总部位于济南市南郊，前身为济南市张夏水暖器材厂，现为国家级“给排水暖通区域性支柱产业”龙头企业。集团总资产达3.6亿元，员工1280人，占地面积1.5平方公里，建筑面积10万平方米。\n企业定位：\n专注于一二类压力容器、水处理设备、换热器、消防设备等产品的研发与制造，并承揽工业废水处理、建筑安装等工程。\n拥有省级技术开发中心，通过ISO 9001质量管理体系认证，是省级高新技术企业，并与山东大学、清华大学等高校合作建立研发基地。\n技术实力：\n拥有教授级高工12人、高级工程师76人，累计研发新产品50余种，获16项国家专利。其囊式供水设备、全自动电脑控制给水设备等技术填补国内空白，并多次被列入国家级星火计划。"
    ],
    "mainProducts": [
      "※核心产品：\n压力容器与换热设备：一二类压力容器、管壳式/板式换热器、凝结水回收装置、热网加热器等。\n水处理设备：工业循环水处理设备、软化水设备、污水及中水处理系统、高频电子水处理仪。\n消防与暖通设备：全自动定压补水装置、锅炉除氧器、消防水带、中央空调系统。\n其他产品：电热水锅炉、燃油/燃气锅炉、分汽缸、不锈钢组合式水箱等。"
    ],
    "addresses": [
      "总部地址：济南市长清区水龙王工业园（主生产基地）\n分支机构：\n北京办事处：北京市西城区西直门内大街172号（联系人邵孟良）\n临沂子公司：临沂市兰山区枣沟头工业园（主营PE水管、消防水带等）"
    ],
    "contactDetails": "联系电话：\n临沂子公司电话：13705396977。\n北京办事处：邵孟良（邮箱：sml1898@163.com）\n邮箱：\n临沂子公司：sdjxhbsb@163.com\n北京办事处：sml1898@163.com\n官网： http://www.sdslwjt.com（暂打不开）",
    "notes": []
  },
  {
    "id": "SUP-KNG-028",
    "supplierCode": "SUP-KNG-202607-028",
    "supplierName": "耐驰 (上海) 机械仪器有限公司",
    "englishName": "NETZSCH (Shanghai) Machinery and Instruments Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 湿法研磨设备：循环式砂磨机 Zeta®、卧式盘式砂磨机 Discus、篮式砂磨机 MasterMill、实验室研磨机 LabSt",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "info.nsc@netzsch.com",
    "phone": "电话：+86 21 6957 6008",
    "website": "https://grinding.netzsch.com/zh-CN/meta-nav/about-us/companies-of-grinding-dispersing/netzsch（耐驰上海公司页面",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      38
    ],
    "bidPackages": [
      "污泥处理设备包"
    ],
    "equipmentLists": [
      "1. 污泥脱水设备\n   - 带式污泥脱水机  \n   - 离心式脱水机  \n   - 板框压滤机（备用）  \n2. 输送设备  \n   - 螺旋输送机  \n   - 污泥泵（螺杆泵）  \n3. 干化与处置 \n   - 污泥干化机（热风能）  \n   - 污泥料仓（防腐蚀材质）"
    ],
    "procurementStrategies": [
      "※输送设备独立标段※"
    ],
    "strengths": [],
    "introductions": [
      "成立背景：\n耐驰（NETZSCH）是德国耐驰集团（NETZSCH Group）旗下核心业务单元之一，专注于研磨、分散及混合技术的研发与制造。其上海公司——耐驰（上海）机械仪器有限公司成立于2016年，是继兰州泵业公司后在中国设立的第二个生产基地，集生产、研发、销售和服务于一体。\n企业定位：\n全球湿法和干法研磨技术的领军企业，覆盖从实验室设备到工业级生产线的全流程解决方案，产品细度可达纳米级。\n应用领域包括化工材料（如电池材料、涂料）、食品与糖果（如巧克力）、医药与化妆品（如药片、香波）、矿产（如石墨、碳酸钙）等。\n通过ISO 9001:2015质量管理体系认证，拥有先进的纳米实验室和生产设备，提供代加工与试点测试服务"
    ],
    "mainProducts": [
      "※主要经营产品：\n湿法研磨设备：循环式砂磨机 Zeta®、卧式盘式砂磨机 Discus、篮式砂磨机 MasterMill、实验室研磨机 LabStar 和 MiniCer®。\n干法设备：分级磨 CSM、机械磨 Condux®、超细流化床气流磨 CGS。\n混合与分散设备：MasterMix® 分散机、新一代固液混合系统 Epsilon、巧克力设备 ChocoEasy®。\n其他产品：激光粒度分析仪、纳米材料处理设备及定制化生产线解决方案。"
    ],
    "addresses": [
      "二厂及总部地址：上海市嘉定区嘉安路3136号，邮编201814\n一厂地址：上海市安亭区远大路38号（安亭大众工业园区），邮编201805"
    ],
    "contactDetails": "电话：+86 21 6957 6008\n邮箱：info.nsc@netzsch.com\n中国区官网：https://grinding.netzsch.com/zh-CN/meta-nav/about-us/companies-of-grinding-dispersing/netzsch（耐驰上海公司页面）",
    "notes": []
  },
  {
    "id": "SUP-KNG-029",
    "supplierCode": "SUP-KNG-202607-029",
    "supplierName": "格兰富水泵（上海）有限公司",
    "englishName": "Grundfos Group",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品系列： 工业泵：用于食品饮料、半导体、新能源等行业的定制化解决方案，涵盖工业水处理、温度控制等。 商业建筑泵：暖通空调、消防系统、区域能",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "saleschina@sales.grundfos.com",
    "phone": "电话：400 920 6655",
    "website": "https://www.grundfos.cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      39
    ],
    "bidPackages": [
      "污泥处理设备包"
    ],
    "equipmentLists": [
      "1. 污泥脱水设备\n   - 带式污泥脱水机  \n   - 离心式脱水机  \n   - 板框压滤机（备用）  \n2. 输送设备  \n   - 螺旋输送机  \n   - 污泥泵（螺杆泵）  \n3. 干化与处置 \n   - 污泥干化机（热风能）  \n   - 污泥料仓（防腐蚀材质）"
    ],
    "procurementStrategies": [
      "※输送设备独立标段※"
    ],
    "strengths": [],
    "introductions": [
      "成立时间：1945年，总部位于丹麦边昂布市（Bjerringbro），是全球领先的水泵及水技术解决方案供应商。\n企业定位：\n2023年全球销售额达46亿欧元（约合358.8亿人民币），业务覆盖60多个国家，员工约20,000人，年产量超1,600万台水泵装置。\n以可持续发展为核心，致力于解决全球水资源与气候挑战，提供高效节能的水泵系统，并承诺2050年实现净零碳排放（已通过SBTi科学碳目标认证）。\n在中国市场：1995年进入中国，设有苏州、无锡等生产基地及上海总部，员工超1,600人，2021年中国区营业额超35亿元人民币。"
    ],
    "mainProducts": [
      "※核心产品系列：\n工业泵：用于食品饮料、半导体、新能源等行业的定制化解决方案，涵盖工业水处理、温度控制等。\n商业建筑泵：暖通空调、消防系统、区域能源解决方案，提升建筑能效。\n市政水务设备：供水、污水处理、农业灌溉及防洪排涝系统。\n民用建筑泵：家庭供水增压、废水提升、生活热水循环等场景。\n创新技术：智能监测平台（如“御水智”）、数字化水泵控制及物联网解决方案。"
    ],
    "addresses": [
      "中国总部地址：上海市闵行区苏虹路33号虹桥天地3号楼10层，邮编201106312\n其他分支机构：\n苏州工厂：苏州工业园区，占地面积4.9万平方米，年产能超106万台水泵\n无锡工厂：通过CNAS认证的测试中心，专注于高精度生产"
    ],
    "contactDetails": "电话：400 920 6655\n邮箱：saleschina@sales.grundfos.com（中国区销售咨询）\n中国区官网：https://www.grundfos.cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-030",
    "supplierCode": "SUP-KNG-202607-030",
    "supplierName": "施耐德电气（中国）有限公司",
    "englishName": "Schneider Electric (China) Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品线： 低压配电：Compact NSXm断路器、iC65微型断路器、TeSys系列接触器、XB2B按钮开关等。 工业自动化：Modico",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "技术支持与售后服务：400-810-1315（中国区统一热线）",
    "website": "https://www.schneider-electric.cn/zh/",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      40
    ],
    "bidPackages": [
      "辅助设备包"
    ],
    "equipmentLists": [
      "1. 电力与动力 \n   - 柴油发电机（备用电源）  \n   - 高低压配电柜  \n   - 电缆及桥架  \n2. 建筑与维护 \n   - 厂区起重机（单梁/双梁）  \n   - 化学药剂储存间（防爆设计）  \n   - 实验室设备（COD测定仪、显微镜等）  \n3. 其他辅助设备\n   - 加药间通风系统  \n   - 厂区照明及安防系统"
    ],
    "procurementStrategies": [
      "*电力系统捆绑采购*\n组合设备：发电机 + 配电柜（由电力工程商整体设计，需稳定供电方案）\n\n优势：确保电力供应稳定性，减少停电风险"
    ],
    "strengths": [
      "低压配电柜 + 能效管理，适配工业场景"
    ],
    "introductions": [
      "成立时间：1836年（最初从事钢铁工业），1987年转型为能源管理与自动化领域的全球领导者，总部位于法国吕埃-马迈松（Rueil-Malmaison）。\n企业定位：\n全球领先的能源管理与自动化数字化解决方案提供商，业务覆盖100多个国家，员工超15万名，合作伙伴逾百万。\n核心领域包括智慧工业、韧性基础设施、未来数据中心、智能楼宇及智慧家居，通过互联产品、自动化、软件与服务，推动客户数字化转型与可持续发展。\n2024年连续被《企业骑士》评为“全球最可持续企业”，年营收超340亿欧元。"
    ],
    "mainProducts": [
      "※核心产品线：\n低压配电：Compact NSXm断路器、iC65微型断路器、TeSys系列接触器、XB2B按钮开关等。\n工业自动化：Modicon系列PLC（如M580、M241）、Altivar变频器（ATV600、ATV900）、Easergy继电保护装置。\n能源管理：PowerLogic智能电表、Back-UPS Pro不间断电源、EcoStruxure能源管理平台。\n智能家居：Unica珍·铂系列开关面板、Xightor侍爵智能家居系统。"
    ],
    "addresses": [
      "中国区总部地址：北京市朝阳区望京东路6号施耐德电气大厦（邮编：100102）\n其他分支机构：\n上海、广州、成都、武汉等地设有分公司及物流中心，覆盖全国主要城市\n北京、上海、西安等地设有研发中心与生产基地"
    ],
    "contactDetails": "技术支持与售后服务：400-810-1315（中国区统一热线）\n采购咨询：400-810-8899\n中国区官网：https://www.schneider-electric.cn/zh/",
    "notes": []
  },
  {
    "id": "SUP-KNG-031",
    "supplierCode": "SUP-KNG-202607-031",
    "supplierName": "康明斯",
    "englishName": "Cummins Inc.",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 发动机： 柴油及天然气发动机，适用于重卡、客车、船舶、工程机械等领域，如X15™系列重型发动机。 零部件： 涡轮增压器、燃料系统",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "待补全",
    "website": "https://www.cummins.com.cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 69,
    "deliveryRisk": "medium",
    "overallScore": 68,
    "confidence": "B",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 75,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      41
    ],
    "bidPackages": [
      "辅助设备包"
    ],
    "equipmentLists": [
      "1. 电力与动力 \n   - 柴油发电机（备用电源）  \n   - 高低压配电柜  \n   - 电缆及桥架  \n2. 建筑与维护 \n   - 厂区起重机（单梁/双梁）  \n   - 化学药剂储存间（防爆设计）  \n   - 实验室设备（COD测定仪、显微镜等）  \n3. 其他辅助设备\n   - 加药间通风系统  \n   - 厂区照明及安防系统"
    ],
    "procurementStrategies": [
      "*电力系统捆绑采购*\n组合设备：发电机 + 配电柜（由电力工程商整体设计，需稳定供电方案）\n\n优势：确保电力供应稳定性，减少停电风险"
    ],
    "strengths": [
      "柴油发电机（备用电源系统），可靠性强"
    ],
    "introductions": [
      "成立时间：1919年，总部位于美国印第安纳州哥伦布市（500 Jackson Street, Columbus, IN 47201）。\n企业定位：\n全球领先的动力解决方案供应商，专注于柴油、天然气、混合动力及电动动力系统的研发、制造与销售，覆盖发动机、零部件、发电设备及新能源技术领域。\n2024年员工超69,600人，年营收超340亿欧元，服务网络覆盖全球100多个国家，拥有9,000多家服务网点。\n在华发展：累计投资超10亿美元，设立37家机构（含26家制造企业），生产发动机、涡轮增压器、排放处理系统等产品，覆盖19个发动机系列。"
    ],
    "mainProducts": [
      "※主要经营产品：\n发动机：\n柴油及天然气发动机，适用于重卡、客车、船舶、工程机械等领域，如X15™系列重型发动机。\n零部件：\n涡轮增压器、燃料系统、排放解决方案（如选择性催化还原系统）、制动器、车桥等。\n新能源技术：\nAccelera部门：氢燃料电池、电解槽、电池系统及电动动力总成，推动零排放目标。\n发电设备：\n200-3000kW柴油发电机组及并联系统，应用于数据中心、工业备用电源等场景。"
    ],
    "addresses": [
      "东风康明斯地址：湖北省襄阳市高新技术产业开发区，生产4-13升柴油/天然气发动机\n重庆康明斯地址：重庆市两江新区，专注11-50升重型柴油机"
    ],
    "contactDetails": "东风康明斯：86(710) 3399100\n重庆康明斯：86(23) 65335888\n中国区官网：https://www.cummins.com.cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-032",
    "supplierCode": "SUP-KNG-202607-032",
    "supplierName": "岛津企业管理（中国）有限公司",
    "englishName": "Shimadzu (China) Co., Ltd",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "主要经营产品： 分析测试仪器： 液相色谱仪（LC）、气相色谱仪（GC）、质谱仪（MS）、光谱仪（如紫外分光光度计）、电子显微镜等。 医疗设备： ",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "chanji@shimadzu.com.cn",
    "phone": "待补全",
    "website": "https://www.shimadzu.com.cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 81,
    "deliveryRisk": "medium",
    "overallScore": 79,
    "confidence": "A",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 88,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      43
    ],
    "bidPackages": [
      "辅助设备包"
    ],
    "equipmentLists": [
      "1. 电力与动力 \n   - 柴油发电机（备用电源）  \n   - 高低压配电柜  \n   - 电缆及桥架  \n2. 建筑与维护 \n   - 厂区起重机（单梁/双梁）  \n   - 化学药剂储存间（防爆设计）  \n   - 实验室设备（COD测定仪、显微镜等）  \n3. 其他辅助设备\n   - 加药间通风系统  \n   - 厂区照明及安防系统"
    ],
    "procurementStrategies": [
      "*实验室设备单独招标*\n精密仪器选择专精品牌"
    ],
    "strengths": [
      "实验室检测设备（COD测定仪），精度高"
    ],
    "introductions": [
      "成立时间：1875年3月31日，由第一代岛津源藏创立，总部位于日本京都府京都市中京区。1917年改组为株式会社岛津制作所。\n企业定位：\n全球领先的测试仪器、医疗器械及工业设备制造商，以“以科学技术向社会做贡献”为宗旨，核心技术包括光技术、X射线技术、图像处理技术。\n2002年，公司研究员田中耕一因开发生物大分子质谱分析法获诺贝尔化学奖，成为公司技术实力的重要标志。\n中国业务始于1956年参加北京国际商品展，1980年设立北京办事处，目前在中国拥有14家分公司、7个分析中心及60多个技术维修点。"
    ],
    "mainProducts": [
      "※主要经营产品：\n分析测试仪器：\n液相色谱仪（LC）、气相色谱仪（GC）、质谱仪（MS）、光谱仪（如紫外分光光度计）、电子显微镜等。\n医疗设备：\nX光机、CT、MRI、数字化医疗影像系统等，子公司北京岛津医疗器械有限公司专注于医疗设备生产。\n工业设备：\n液压设备（如高压齿轮泵、多路阀）、工业炉、真空设备（如分子泵）、环境监测仪器等。\n其他产品：\n实验器材（如色谱柱、样品前处理耗材）、检测服务（第三方分析检测）。"
    ],
    "addresses": [
      "岛津企业管理（中国）有限公司地址：上海市外高桥保税区富特西一路381号汤臣园区A1楼第6层B部位。\n岛津仪器（苏州）有限公司地址：江苏省苏州市新区泰山路183号（生产基地）"
    ],
    "contactDetails": "中国区产业机械咨询：(021) 3419-3815 / 3419-3817 \n上海分公司：(021) 3419-3888\n苏州工厂：0512-66621026 \n产业机械咨询邮箱：chanji@shimadzu.com.cn \n中国区官网：https://www.shimadzu.com.cn",
    "notes": []
  },
  {
    "id": "SUP-KNG-033",
    "supplierCode": "SUP-KNG-202607-033",
    "supplierName": "安捷伦",
    "englishName": "Agilent Technologies Inc",
    "countryCode": "CN",
    "countryRegion": "中国",
    "category": "设备制造商",
    "mainScope": "核心产品线： 生命科学与化学分析：气相色谱（GC）、液相色谱（LC）、质谱（MS）、核磁共振（NMR）设备。基因测序、蛋白质组学相关仪器及耗材。",
    "contact": "待补全",
    "whatsapp": "待补全",
    "email": "待补全",
    "phone": "待补全",
    "website": "https://www.agilent.com.cn",
    "quoteCount": 0,
    "lastQuoteAt": "2026-07-23",
    "responseSpeed": "一般",
    "technicalCapability": 60,
    "deliveryRisk": "medium",
    "overallScore": 58,
    "confidence": "C",
    "aiEvaluation": "厂家能力资料较完整，但联系人缺失；建议补全联系方式并人工复核后用于询价。",
    "riskLevel": "medium",
    "status": "待复核",
    "dataCompleteness": 63,
    "importBatch": "IMP-KNG-20260723",
    "sourceFile": "副本刚果（金）卡南加水厂营销阶段采购建议及供应商信息(1).xlsx",
    "sourceSheet": "采购建议",
    "sourceRows": [
      44
    ],
    "bidPackages": [
      "辅助设备包"
    ],
    "equipmentLists": [
      "1. 电力与动力 \n   - 柴油发电机（备用电源）  \n   - 高低压配电柜  \n   - 电缆及桥架  \n2. 建筑与维护 \n   - 厂区起重机（单梁/双梁）  \n   - 化学药剂储存间（防爆设计）  \n   - 实验室设备（COD测定仪、显微镜等）  \n3. 其他辅助设备\n   - 加药间通风系统  \n   - 厂区照明及安防系统"
    ],
    "procurementStrategies": [
      "*实验室设备单独招标*\n精密仪器选择专精品牌"
    ],
    "strengths": [],
    "introductions": [
      "成立背景：\n安捷伦科技于1999年从惠普（HP）公司分立而来，总部位于美国加利福尼亚州圣克拉拉市（Santa Clara），是生命科学、诊断和应用化学市场的全球领导者。公司以测量技术为核心，业务覆盖通信、电子、生物医药、环境监测等领域。\n全球地位：\n在生命科学仪器领域，安捷伦的气相色谱、液相色谱、质谱等设备市场占有率全球领先，收购瓦里安（Varian）后成为全球三大核磁共振供应商之一。\n参与多项国际重大赛事（如奥运会）的兴奋剂检测，仪器技术被广泛认可。\n在华发展：\n1980年代进入中国，总部设于北京，在上海、杭州设有工厂和研发中心，员工超2,000人。业务涵盖研发、制造、销售及技术支持，支持中国“健康中国2030”等国家战略。"
    ],
    "mainProducts": [
      "※核心产品线：\n生命科学与化学分析：气相色谱（GC）、液相色谱（LC）、质谱（MS）、核磁共振（NMR）设备。基因测序、蛋白质组学相关仪器及耗材。\n诊断与医疗设备：癌症诊断工具、病理学实验室解决方案。\n电子测量与通信测试：射频信号源、频谱分析仪、光通信测试设备（如光谱分析仪）。\n环境与食品安全检测：污染物监测仪器（如农药残留检测设备）。\n半导体与工业测试：薄膜晶体管测试设备、高速数字电路设计工具。"
    ],
    "addresses": [
      "北京总部：北京市朝阳区望京北路3号3层114。\n上海地址：安捷伦科技（上海）有限公司，专注于研发与制造，地址位于外高桥保税区"
    ],
    "contactDetails": "中国区官网：https://www.agilent.com.cn",
    "notes": []
  }
];

export const importedKanangaSupplierById = Object.fromEntries(
  importedKanangaSuppliers.map((supplier) => [supplier.id, supplier]),
) as Record<string, ImportedKanangaSupplier>;
