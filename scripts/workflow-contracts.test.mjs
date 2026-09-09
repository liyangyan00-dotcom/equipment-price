import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("自动套价仅查询已通过人工审核的价格", async () => {
  const source = await read(
    "src/app/api/project-pricing/[id]/auto-price/route.ts",
  );
  assert.match(source, /approvedReviewStatus\s*=\s*["']approved["']/);
  assert.equal(source.includes('["approved", "pending_review"]'), false);
  assert.equal(
    (source.match(/\.eq\("review_status", approvedReviewStatus\)/g) ?? [])
      .length,
    2,
  );
  assert.equal(
    (
      source.match(
        /\.eq\("supplier\.review_status", approvedReviewStatus\)/g,
      ) ?? []
    ).length,
    2,
  );
  assert.equal(
    (source.match(/\.gte\("valid_until", today\)/g) ?? []).length,
    2,
  );
  assert.match(
    source,
    /equipmentQuery = equipmentQuery\.eq\("price_term", projectPriceTerm\)/,
  );
  assert.match(
    source,
    /materialQuery = materialQuery\.ilike\("region", targetRegion\)/,
  );
  assert.match(source, /candidate\.sourceType !== expectedSource/);
  assert.match(source, /计量单位不一致/);
  assert.match(source, /algorithmVersion: "business-rules-v2"/);
});

test("应用布局不再挂载全局模拟交互", async () => {
  const source = await read("src/components/layout/AppLayout.tsx");
  assert.equal(source.includes("MockInteractionProvider"), false);
});

test("价格与 AI 核心页面不再使用模拟导出", async () => {
  for (const path of [
    "src/app/material-prices/page.tsx",
    "src/app/equipment-prices/page.tsx",
    "src/app/ai-workbench/page.tsx",
  ]) {
    const source = await read(path);
    assert.equal(source.includes("MockExportDialog"), false, path);
    assert.equal(source.includes("仅为前端 Mock 导出"), false, path);
  }
});

test("新建询价不再使用模拟上传或模拟 AI 生成", async () => {
  const source = await read("src/app/inquiries/create/page.tsx");
  assert.equal(source.includes("MockUploadDialog"), false);
  assert.equal(source.includes("useMockAiAction"), false);
  assert.match(source, /workflowKey:\s*["']inquiry_letter["']/);
  assert.match(source, /parseInquiryImport\(file/);
});

test("报价识别必须进入人工审核后才能通过受控 RPC 入库", async () => {
  const parseRoute = await read(
    "src/app/api/quote-recognition/[id]/parse/route.ts",
  );
  const reviewRoute = await read(
    "src/app/api/quote-recognition/items/[itemId]/route.ts",
  );
  const migration = await read(
    "supabase/migrations/20260821111410_quote_recognition_pending_review_p0.sql",
  );

  assert.match(
    parseRoute,
    /review_status:\s*item\.missingFields\.length\s*\?\s*["']needs_info["']\s*:\s*["']pending_review["']/,
  );
  assert.match(parseRoute, /requiresHumanReview:\s*true/);
  assert.match(reviewRoute, /reviewRoles\.has\(access\.role\)/);
  assert.match(reviewRoute, /\.rpc\(["']wpi_import_quote_item["']/);
  assert.match(
    migration,
    /create or replace function public\.wpi_import_quote_item/i,
  );
});

test("询价发送前校验 AI 审核、供应商准入和邮件集成", async () => {
  const source = await read("src/app/api/inquiries/[id]/send/route.ts");

  assert.match(source, /emailGatewayIssues\(integration\.data\)/);
  assert.match(source, /metadata\.aiApprovalStatus\s*!==\s*["']approved["']/);
  assert.match(source, /supplier\?\.review_status\s*!==\s*["']approved["']/);
  assert.match(source, /functions\.invoke\(["']wpi-inquiry-mailer["']/);
});

test("询价比价仅基于真实报价并进入人工复核", async () => {
  const source = await read("src/app/api/inquiries/[id]/comparison/route.ts");

  assert.match(source, /缺少.*可核验参考汇率/);
  assert.match(source, /status:\s*["']needs_review["']/);
  assert.match(source, /event_type:\s*["']comparison_generated["']/);
});

test("项目套价 AI 推荐仍需人工确认", async () => {
  const autoPrice = await read(
    "src/app/api/project-pricing/[id]/auto-price/route.ts",
  );
  const manualPrice = await read(
    "src/app/api/project-pricing/[id]/items/[itemId]/route.ts",
  );
  const reviewMigration = await read(
    "supabase/migrations/20260829182710_allow_reviewer_confirm_project_pricing.sql",
  );

  assert.match(autoPrice, /decision_status:\s*["']ai_recommended["']/);
  assert.match(autoPrice, /requiresHumanReview:\s*true/);
  assert.match(autoPrice, /status:\s*["']pending_review["']/);
  assert.match(manualPrice, /body\.confirm/);
  assert.match(manualPrice, /rpc\(\s*"wpi_confirm_project_pricing_item"/);
  assert.match(reviewMigration, /decision_status = 'confirmed'/);
});

test("重新自动套价不会覆盖人工选择或已确认价格", async () => {
  const autoPrice = await read(
    "src/app/api/project-pricing/[id]/auto-price/route.ts",
  );

  assert.match(
    autoPrice,
    /lockedDecisionStatuses\s*=\s*new Set\(\["confirmed",\s*"manual_selected"\]\)/,
  );
  assert.match(
    autoPrice,
    /lockedDecisionStatuses\.has\(item\.decision_status\)/,
  );
  assert.match(autoPrice, /lockedItemCount/);
});

test("驳回或归档询价会释放未回填的套价缺口", async () => {
  const inquiryRoute = await read("src/app/api/inquiries/[id]/route.ts");
  const pricingPage = await read("src/app/project-pricing/page.tsx");
  const pricingServer = await read("src/lib/projectPricing/server.ts");

  assert.match(
    inquiryRoute,
    /body\.status === "rejected" \|\| body\.status === "archived"/,
  );
  assert.match(inquiryRoute, /inquiryReleasedReason:\s*body\.status/);
  assert.match(inquiryRoute, /shouldReturnToGap/);
  assert.match(pricingServer, /attachInquiryStatuses/);
  assert.match(
    pricingPage,
    /status === "rejected" \|\| status === "archived" \|\| status === "missing"/,
  );
});

test("审核员通过受控 RPC 确认套价且金额区分估算与已确认", async () => {
  const itemRoute = await read(
    "src/app/api/project-pricing/[id]/items/[itemId]/route.ts",
  );
  const server = await read("src/lib/projectPricing/server.ts");
  const page = await read("src/app/project-pricing/page.tsx");
  const migration = await read(
    "supabase/migrations/20260829182710_allow_reviewer_confirm_project_pricing.sql",
  );
  const scopeMigration = await read(
    "supabase/migrations/20260829183041_scope_project_pricing_confirmation_to_project.sql",
  );
  const auditMigration = await read(
    "supabase/migrations/20260830123000_enhance_project_pricing_confirmation_audit.sql",
  );

  assert.match(
    server,
    /projectPricingReviewRoles\s*=\s*new Set\(\["admin",\s*"manager",\s*"editor",\s*"reviewer"\]\)/,
  );
  assert.match(itemRoute, /rpc\(\s*"wpi_confirm_project_pricing_item"/);
  assert.match(itemRoute, /p_project_id:\s*id/);
  assert.match(
    migration,
    /private\.wpi_has_permission\(v_organization_id, 'price\.review'\)/,
  );
  assert.match(migration, /decision_status = 'confirmed'/);
  assert.match(
    scopeMigration,
    /where id = p_item_id\s+and project_id = p_project_id/,
  );
  assert.match(page, /保存候选方案/);
  assert.match(page, /确认价格并完成本项/);
  assert.match(page, /confirmedUsd/);
  assert.match(page, /当前估算/);
  assert.match(itemRoute, /p_confirmation_reason:\s*confirmationReason/);
  assert.match(itemRoute, /p_price_basis:\s*priceBasis/);
  assert.match(itemRoute, /p_decision_context:\s*decisionContext/);
  assert.match(itemRoute, /candidatePreviousUnitPrice/);
  assert.match(auditMigration, /'confirmationReason', p_confirmation_reason/);
  assert.match(auditMigration, /'confirmedPreviousUnitPrice'/);
  assert.match(auditMigration, /'confirmationDifferencePct'/);
  assert.match(auditMigration, /'confirmationSubtotalUsd'/);
  assert.match(auditMigration, /'confirmedSupplierName'/);
  const detailPage = await read(
    "src/components/project-pricing/ProjectPricingDetailView.tsx",
  );
  assert.match(detailPage, /当前估算金额/);
  assert.match(detailPage, /已确认金额/);
  assert.match(detailPage, /待人工确认/);
  assert.match(detailPage, /sourceRecordHref/);
  assert.match(page, /候选价格对比/);
});

test("项目套价价格确认抽屉具备完整商务依据和连续审核", async () => {
  const page = await read("src/app/project-pricing/page.tsx");
  const autoPrice = await read(
    "src/app/api/project-pricing/[id]/auto-price/route.ts",
  );

  assert.match(page, /AI 推荐依据/);
  assert.match(page, /价格决策方式/);
  assert.match(page, /采用 AI 推荐/);
  assert.match(page, /选择候选价格/);
  assert.match(page, /手工调整/);
  assert.match(page, /确认价格与原因/);
  assert.match(page, /税费与运保/);
  assert.match(page, /金额影响预览/);
  assert.match(page, /项目估算更新后/);
  assert.match(page, /上一条待确认价格/);
  assert.match(page, /下一条待确认价格/);
  assert.match(page, /继续确认/);
  assert.match(page, /nextPending\.boq_code/);
  assert.match(page, /确认采用该价格/);
  assert.match(autoPrice, /supplierId: entry\.candidate\.supplierId/);
});

test("项目套价 P1 工作区合并待办并在询价创建后返回缺口页", async () => {
  const navigation = await read("src/config/navigation.ts");
  const page = await read("src/app/project-pricing/page.tsx");
  const inquiryCreate = await read("src/app/inquiries/create/page.tsx");

  assert.match(navigation, /project-pricing-pending/);
  assert.match(navigation, /projectPricingPending/);
  assert.match(page, /selectedGapIds/);
  assert.match(page, /returnTo:\s*pricingViewHref\("gaps", projectId\)/);
  assert.match(page, /生成询价/);
  assert.match(
    inquiryCreate,
    /requestedReturnTo\.startsWith\("\/project-pricing"\)/,
  );
  assert.match(
    inquiryCreate,
    /createdInquiry=\$\{encodeURIComponent\(inquiryId\)\}/,
  );
});

test("项目套价信息架构只保留项目、工作台和成果三层", async () => {
  const navigation = await read("src/config/navigation.ts");
  const sidebar = await read("src/components/layout/SidebarNavItem.tsx");
  const page = await read("src/app/project-pricing/page.tsx");
  const boqPage = await read("src/app/project-pricing/boq-parse/page.tsx");

  assert.match(navigation, /title: "套价项目"/);
  assert.match(navigation, /title: "套价工作台"/);
  assert.match(navigation, /title: "套价成果"/);
  assert.match(
    navigation,
    /title: "项目套价",[\s\S]*?badgeKey: "projectPricingPending"/,
  );
  assert.doesNotMatch(navigation, /title: "套价工作台"[^\n]*badgeKey/);
  assert.equal(navigation.includes('title: "BOQ 处理"'), false);
  assert.equal(navigation.includes('title: "待处理"'), false);
  assert.match(sidebar, /project-pricing-workspace/);
  assert.match(page, /view === "projects"\s*\? "项目套价"/);
  assert.match(page, /view === "reports"\s*\? \(/);
  assert.match(page, /view="workspace"/);
  assert.match(page, /table-fixed min-w-\[1440px\]/);
  assert.match(page, /\[&_td\]:whitespace-nowrap/);
  assert.match(page, /xl:grid-cols-3 2xl:grid-cols-6/);
  assert.match(page, /view === "review"/);
  assert.match(page, /aria-label="套价结果工作队列"/);
  assert.match(page, /全部 BOQ/);
  assert.match(page, /仅显示待人工确认的推荐价/);
  assert.match(page, /仅显示价格缺口/);
  assert.doesNotMatch(page, /aria-label="项目套价工作台阶段"/);
  assert.match(page, /核对原始 BOQ/);
  assert.match(page, /待确认价格/);
  assert.match(page, /价格确认流程/);
  assert.match(page, /定位人工确认区/);
  assert.match(page, /id="pricing-decision-panel"/);
  assert.match(page, /AI 建议与人工确认/);
  assert.match(page, /确认或调整价格/);
  assert.match(page, /boq-parse\?projectId=\$\{data\.project\.id\}/);
  assert.match(page, /w-40 px-2 text-right">操作/);
  assert.match(page, /成果口径/);
  assert.match(page, /数据追溯/);
  assert.match(page, /闭环待办/);
  assert.match(boqPage, /view=workspace&projectId=/);
});

test("项目套价未闭环时只能导出带状态标记的草稿", async () => {
  const page = await read("src/app/project-pricing/page.tsx");

  assert.match(page, /const formalReady = unresolvedForReport === 0/);
  assert.match(page, /formalReady \? "导出正式套价表" : "导出套价草稿"/);
  assert.match(page, /"成果状态", resultStatus/);
  assert.match(page, /"未闭环项数", unresolvedForReport/);
  assert.match(page, /仅供过程复核，不得作为正式商务成果发布/);
  assert.match(page, /formalReady \? "pricing-final" : "pricing-draft"/);
});

test("项目套价 P1 使用业务状态并从成果页直达待办", async () => {
  const page = await read("src/app/project-pricing/page.tsx");
  const overview = await read(
    "src/components/project-pricing/ProjectPricingOverview.tsx",
  );

  assert.match(overview, /function projectOperationalStatus/);
  assert.match(overview, /待确认 \$\{pendingConfirmation\}/);
  assert.match(overview, /待询价 \$\{pendingInquiry\}/);
  assert.match(overview, /待回填 \$\{pendingBackfill\}/);
  assert.match(overview, /label: "可输出"/);
  assert.equal((overview.match(/>新建项目<\/button>/g) || []).length, 0);
  assert.match(page, /"无可确认项"/);
  assert.match(page, /处理 \$\{pendingConfirmation\} 项待确认价格/);
  assert.match(page, /处理 \$\{pendingBackfill\} 项询价缺口/);
});

test("套价项目页提供真实汇总筛选并直达下一业务阶段", async () => {
  const overview = await read(
    "src/components/project-pricing/ProjectPricingOverview.tsx",
  );

  assert.match(overview, /搜索项目名称、编号或地区/);
  assert.match(overview, /全部待处理/);
  assert.match(overview, /闭环进度/);
  assert.match(overview, /completionRate/);
  assert.match(overview, /下一步业务动作/);
  assert.match(overview, /params\.set\("view", operationalStatus\.view/);
  assert.match(overview, /闭环进度按已确认价格与已回填报价计算/);
});

test("项目套价 P2 按品类编排真实供应商询价包并保留人工确认", async () => {
  const { buildGapInquiryPlan } =
    await import("../src/lib/projectPricing/gapInquiryPlan.ts");
  const plan = buildGapInquiryPlan(
    "PRJ-001",
    [
      {
        id: "gap-equipment",
        item_name: "卧式离心泵",
        specification: "Q=500m3/h",
        category: "equipment",
        risk_level: "high",
        needs_inquiry: true,
        match_level: "unmatched",
        metadata: {},
      },
      {
        id: "gap-material",
        item_name: "水泥",
        specification: "CEM II 42.5R",
        category: "material",
        risk_level: "medium",
        needs_inquiry: true,
        match_level: "unmatched",
        metadata: {},
      },
      {
        id: "linked",
        item_name: "钢筋",
        specification: "HRB400",
        category: "material",
        risk_level: "low",
        needs_inquiry: true,
        match_level: "unmatched",
        metadata: { inquiryId: "inq-1" },
      },
    ],
    [
      {
        legacy_id: "SUP-EQ",
        supplier_code: "SUP-EQ",
        name: "泵阀供应商",
        category: "机电设备",
        business_scope: "水泵 阀门",
        region: "Kinshasa",
        confidence: 92,
        risk_level: "low",
        review_status: "approved",
      },
      {
        legacy_id: "SUP-MAT",
        supplier_code: "SUP-MAT",
        name: "建材供应商",
        category: "地材",
        business_scope: "水泥 钢筋",
        region: "Matadi",
        confidence: 88,
        risk_level: "low",
        review_status: "approved",
      },
      {
        legacy_id: "SUP-DRAFT",
        supplier_code: "SUP-DRAFT",
        name: "待审供应商",
        category: "设备",
        business_scope: "水泵",
        region: "Goma",
        confidence: 99,
        risk_level: "low",
        review_status: "pending_review",
      },
    ],
  );

  assert.equal(plan.packages.length, 2);
  assert.equal(plan.summary.eligibleItemCount, 2);
  assert.equal(plan.requiresHumanReview, true);
  assert.equal(
    plan.packages.find((group) => group.id === "equipment")?.responseDays,
    3,
  );
  assert.equal(
    plan.packages.some((group) => group.itemIds.includes("linked")),
    false,
  );
  assert.equal(
    plan.packages.some((group) =>
      group.suppliers.some((supplier) => supplier.supplierId === "SUP-DRAFT"),
    ),
    false,
  );

  const route = await read(
    "src/app/api/project-pricing/[id]/gap-inquiry-plan/route.ts",
  );
  const workspace = await read(
    "src/components/project-pricing/ProjectPricingGapPlan.tsx",
  );
  assert.match(route, /\.eq\("review_status", "approved"\)/);
  assert.match(workspace, /supplierIds:/);
  assert.match(workspace, /responseDays:/);
  assert.match(workspace, /推荐结果须人工确认/);
});

test("项目套价零匹配时完成 AI 分类并进入缺口询价", async () => {
  const { getProjectPricingWorkflow } =
    await import("../src/lib/projectPricing/workflow.ts");
  const workflow = getProjectPricingWorkflow({
    hasProject: true,
    totalItems: 10,
    matchedItems: 0,
    confirmedItems: 0,
    gapItems: 10,
    inquiryLinkedItems: 0,
    inquiryQuoteItems: 0,
    matchingCompleted: true,
  });

  assert.equal(workflow.matching, "done");
  assert.equal(workflow.review, "done");
  assert.equal(workflow.inquiry, "active");
  assert.equal(workflow.backfill, "pending");
});

test("项目套价询价与回填必须全量完成", async () => {
  const { getProjectPricingWorkflow } =
    await import("../src/lib/projectPricing/workflow.ts");
  const partial = getProjectPricingWorkflow({
    hasProject: true,
    totalItems: 10,
    matchedItems: 4,
    confirmedItems: 4,
    gapItems: 6,
    inquiryLinkedItems: 2,
    inquiryQuoteItems: 1,
    matchingCompleted: true,
  });

  assert.equal(partial.inquiry, "active");
  assert.equal(partial.backfill, "active");

  const inquiryRoute = await read("src/app/api/inquiries/route.ts");
  assert.match(inquiryRoute, /PROJECT_PRICING_INQUIRY_EXISTS/);
  assert.match(inquiryRoute, /status:\s*409/);
});

test("报告生成、提交和批准具有完整人工审核门禁", async () => {
  const createRoute = await read("src/app/api/reports/route.ts");
  const detailRoute = await read("src/app/api/reports/[id]/route.ts");

  assert.match(
    createRoute,
    /creatableStatuses\s*=\s*new Set\(\[["']draft["'],\s*["']pending_review["']\]\)/,
  );
  assert.match(
    detailRoute,
    /pending_review:\s*new Set\(\[["']approved["'],\s*["']rejected["']\]\)/,
  );
  assert.match(detailRoute, /validateReviewChecklist/);
  assert.match(detailRoute, /已提交审核或已归档的报告不能直接修改/);
});

test("设备文档解析委派给真实 Worker 并保留人工复核", async () => {
  const source = await read(
    "src/app/api/equipment-catalog/[id]/documents/parse/route.ts",
  );

  assert.match(
    source,
    /functions\.invoke\(["']wpi-equipment-document-worker["']/,
  );
  assert.match(source, /requiresHumanReview:\s*true/);
  assert.match(source, /review_decision/);
});

test("价格采集与询价提醒均由数据库定时任务触发", async () => {
  const collectorCron = await read(
    "supabase/migrations/20260821160152_schedule_price_collection.sql",
  );
  const reminderCron = await read(
    "supabase/migrations/20260822202317_inquiry_runtime_completion.sql",
  );

  assert.match(collectorCron, /cron\.schedule/i);
  assert.match(collectorCron, /wpi-price-collector/);
  assert.match(reminderCron, /cron\.schedule/i);
  assert.match(reminderCron, /wpi-inquiry-reminder-runner/);
});

test("价格采集 P0 将候选、人工审核与正式入库严格分层", async () => {
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");
  const leadPool = await read("src/components/price-leads/PriceLeadsWorkspace.tsx");
  const apiRoute = await read("src/app/api/price-collection/route.ts");
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");
  const migration = await read(
    "supabase/migrations/20260829223722_harden_price_collection_p0.sql",
  );

  assert.match(collectionPage, /进入线索池审核/);
  assert.equal(collectionPage.includes('action: "transfer"'), false);
  assert.match(leadPool, /确认并入库/);
  assert.match(leadPool, /resolve_duplicate/);
  assert.match(apiRoute, /action === "update_schedule"/);
  assert.match(worker, /success_count:\s*businessOutcome\.qualifiedLeadCount/);
  assert.match(migration, /wpi_price_collection_evidence evidence/);
  assert.match(migration, /fx_status = 'verified'/);
  assert.match(migration, /duplicate_status <> 'unique'/);
  assert.match(migration, /interval '180 days'/);
  assert.match(migration, /success_count = qualified_count/);
});

test("价格采集 P0 支持 CDF 汇率并按地区识别重复价格", async () => {
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");
  const migration = await read(
    "supabase/migrations/20260831100218_fix_price_collection_cdf_fx_and_regional_dedup.sql",
  );

  assert.match(worker, /\["USD", "EUR", "CDF"\]/);
  assert.match(worker, /open\.er-api\.com\/v6\/latest\/CDF/);
  assert.match(worker, /20 \* 60 \* 60 \* 1000/);
  assert.match(migration, /normalized_unit/);
  assert.match(migration, /wpi_normalize_collection_text\(candidate\.region\)/);
  assert.match(migration, /ExchangeRate-API open access/);
  assert.match(migration, /status <> 'rejected'/);
});

test("价格采集分析按设备与地材统一切换且不受结果分页限制", async () => {
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");

  assert.match(collectionPage, /分析对象/);
  assert.match(collectionPage, /setAnalysisType/);
  assert.match(collectionPage, /pageSize:\s*"100"/);
  assert.match(collectionPage, /仅切换下方分析口径，不改变上方结果表和审核选择/);
  assert.match(collectionPage, /当前\{analysisScopeLabel\}筛选下暂无地区数据/);
  assert.match(collectionPage, /leads=\{analysisRows\}/);
});

test("价格采集 P1 提供工作队列、准入治理与来源级重试", async () => {
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");
  const leadPool = await read("src/components/price-leads/PriceLeadsWorkspace.tsx");
  const taskDetail = await read("src/components/ai-workflow/PriceCollectionTaskDetail.tsx");
  const apiRoute = await read("src/app/api/price-collection/route.ts");
  const migration = await read("supabase/migrations/20260831092151_price_collection_p1_workflow.sql");

  assert.match(collectionPage, /今日工作队列/);
  assert.match(collectionPage, /执行：/);
  assert.match(collectionPage, /结果：/);
  assert.match(collectionPage, /toggleTaskSchedule/);
  assert.match(leadPool, /准入问题队列/);
  assert.match(leadPool, /批量确认非重复/);
  assert.match(leadPool, /批量重新核验/);
  assert.match(taskDetail, /来源运行明细/);
  assert.match(taskDetail, /重试失败来源/);
  assert.match(taskDetail, /任务质量趋势/);
  assert.match(apiRoute, /wpi_search_price_collection_leads_v4/);
  assert.match(migration, /filter_issue/);
  assert.match(migration, /missingEvidence/);
});

test("价格采集任务详情 P0 使用真实线索口径并聚合关键事件", async () => {
  const taskDetail = await read("src/components/ai-workflow/PriceCollectionTaskDetail.tsx");
  const detailRoute = await read("src/app/api/price-collection/tasks/[id]/route.ts");
  const types = await read("src/types/priceCollection.ts");

  assert.match(detailRoute, /from\("wpi_price_collection_leads"\)/);
  assert.doesNotMatch(detailRoute, /leads:\s*\[\]/);
  assert.match(detailRoute, /pendingLeadResult/);
  assert.match(detailRoute, /highRiskLeadResult/);
  assert.match(types, /totalLeads: number/);
  assert.match(taskDetail, /currentSourceRuns/);
  assert.match(taskDetail, /关键执行记录/);
  assert.match(taskDetail, /repeatCount/);
  assert.match(taskDetail, /异常来源处理/);
  assert.match(taskDetail, /查看 .*条待审核线索/);
  assert.match(taskDetail, /workflowStatusLabel/);
});

test("价格采集任务详情 P1 按结果、执行和配置组织信息", async () => {
  const taskDetail = await read("src/components/ai-workflow/PriceCollectionTaskDetail.tsx");

  assert.match(taskDetail, /type DetailTab = "results" \| "execution" \| "config"/);
  assert.match(taskDetail, /结果与证据/);
  assert.match(taskDetail, /执行批次上下文/);
  assert.match(taskDetail, /采集范围与规则/);
  assert.match(taskDetail, /价格时间口径/);
  assert.match(taskDetail, /最新报价月份/);
  assert.match(taskDetail, /最近执行时间/);
  assert.match(taskDetail, /aria-expanded=\{sourcesOpen\}/);
  assert.match(taskDetail, /aria-expanded=\{scheduleOpen\}/);
  assert.match(taskDetail, /selectedRunId/);
});

test("价格采集任务详情 P2 提供归档导出与受控删除", async () => {
  const taskDetail = await read("src/components/ai-workflow/PriceCollectionTaskDetail.tsx");
  const collectionRoute = await read("src/app/api/price-collection/route.ts");
  assert.match(taskDetail, /title="任务管理"/);
  assert.match(taskDetail, /updateArchiveStatus/);
  assert.match(taskDetail, /action: nextAction/);
  assert.match(taskDetail, /exportTaskArchive/);
  assert.match(taskDetail, /price-collection-task-v1/);
  assert.match(taskDetail, /删除空任务/);
  assert.match(taskDetail, /hasBusinessResults/);
  assert.match(taskDetail, /managementConfirm === "archive"/);
  assert.match(taskDetail, /managementConfirm === "delete"/);
  assert.match(taskDetail, /\["queued", "running", "paused"\].*\.includes\(task\.status\)/);
  assert.match(collectionRoute, /action === "archive" \|\| action === "restore"/);
  assert.match(collectionRoute, /任务已有.*条业务成果，只能归档，不能删除/);
});

test("价格采集任务详情候选线索服务端分页且调整范围创建新任务", async () => {
  const taskDetail = await read("src/components/ai-workflow/PriceCollectionTaskDetail.tsx");
  const taskRoute = await read("src/app/api/price-collection/tasks/[id]/route.ts");
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");
  assert.match(taskDetail, /leadPageSize/);
  assert.match(taskDetail, /data\.leadPagination\.pageCount/);
  assert.match(taskDetail, /table-fixed/);
  assert.match(taskDetail, /whitespace-nowrap/);
  assert.match(taskDetail, /调整范围并创建新任务/);
  assert.match(taskRoute, /leadPageSize/);
  assert.match(taskRoute, /\.range\(leadRangeFrom, leadRangeTo\)/);
  assert.match(taskDetail, /createTaskFromScope/);
  assert.match(taskDetail, /clonedFromTaskId/);
  assert.match(taskDetail, /samePeriodPolicy: "update_observation"/);
  assert.match(taskDetail, /crossPeriodPolicy: "create_new"/);
  assert.match(taskDetail, /同月更新观察，跨月新增价格/);
  assert.doesNotMatch(collectionPage, /cloneTaskId/);
});

test("价格采集按价格所属期增量去重并保留跨月价格", async () => {
  const migration = await read(
    "supabase/migrations/20260901151610_monthly_price_dedup_identity.sql",
  );
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");

  assert.match(migration, /wpi_price_period_identity/);
  assert.match(migration, /candidate_period_identity/);
  assert.match(migration, /samePeriodPolicy', 'update_observation'/);
  assert.match(migration, /crossPeriodPolicy', 'create_new'/);
  assert.match(migration, /observation_count = observation_count \+ 1/);
  assert.match(worker, /pricePeriodGranularity/);
  assert.match(collectionPage, /dedupScope: "item_source_price_period"/);
});

test("价格采集周期调度、子运行审计与旧版 RPC 权限收口", async () => {
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");
  const apiRoute = await read("src/app/api/price-collection/route.ts");
  const migration = await read(
    "supabase/migrations/20260831102426_harden_price_collection_schedule_and_audit.sql",
  );
  const scheduleMigration = await read(
    "supabase/migrations/20260831105517_align_price_collection_next_run_to_schedule.sql",
  );
  const duplicateRunGuard = await read(
    "supabase/migrations/20260901154353_prevent_duplicate_price_collection_runs.sql",
  );
  const scheduleAdvance = await read(
    "supabase/migrations/20260901154925_advance_price_collection_schedule_after_run.sql",
  );

  assert.match(worker, /parentTriggerTypes\.get\(sourceRun\.parent_run_id\)/);
  assert.equal(worker.includes('triggerType: "schedule",'), false);
  assert.match(apiRoute, /schedule_expression:\s*schedule\.scheduleExpression/);
  assert.match(apiRoute, /daysUntilMonday/);
  assert.match(migration, /productionSchedule/);
  assert.match(migration, /DRC_TALO_OFFICIAL/);
  assert.match(migration, /DRC_CAID_LOKOLE/);
  assert.match(migration, /from public, anon/i);
  assert.match(migration, /to authenticated, service_role/i);
  assert.match(scheduleMigration, /date_trunc\('week', from_time\)/);
  assert.match(scheduleMigration, /interval '1 week 2 hours'/);
  assert.match(duplicateRunGuard, /source_run\.status in \('queued', 'running', 'partial'\)/);
  assert.match(scheduleAdvance, /when schedule_enabled then private\.wpi_collection_next_run\(frequency, now\(\)\)/);
});

test("价格采集 P1 形成增量证据、周期运营、异常通知与审核 SLA 闭环", async () => {
  const migration = await read(
    "supabase/migrations/20260831111432_price_collection_p1_operations.sql",
  );
  const taskDetail = await read(
    "src/components/ai-workflow/PriceCollectionTaskDetail.tsx",
  );
  const topbar = await read("src/app/api/topbar/route.ts");
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");

  assert.match(migration, /observation_key/);
  assert.match(migration, /observation_count/);
  assert.match(migration, /interval '48 hours'/);
  assert.match(taskDetail, /周期任务运营/);
  assert.match(taskDetail, /Asia\/Shanghai/);
  assert.match(taskDetail, /连续异常/);
  assert.match(taskDetail, /观察 \{evidence\.observationCount\} 次/);
  assert.match(topbar, /derived:collection-source-failed/);
  assert.match(topbar, /derived:collection-missing-fx/);
  assert.match(topbar, /derived:price-lead-overdue/);
  assert.match(collectionPage, /defaultReviewDueAt/);
});

test("价格采集 P2 形成来源质量、品类周期、v3 下线与权限收口", async () => {
  const migration = await read(
    "supabase/migrations/20260831121728_price_collection_p2_source_quality_category_schedule_security.sql",
  );
  const taskDetail = await read(
    "src/components/ai-workflow/PriceCollectionTaskDetail.tsx",
  );
  const schedulePanel = await read(
    "src/components/ai-workflow/PriceCollectionSchedulePolicies.tsx",
  );
  const apiRoute = await read("src/app/api/price-collection/route.ts");
  const sourceFiles = await Promise.all([
    read("src/app/api/price-collection/route.ts"),
    read("src/app/api/price-collection/tasks/[id]/route.ts"),
    read("supabase/functions/wpi-price-collector/index.ts"),
  ]);

  assert.match(migration, /wpi_price_collection_source_quality_metrics/);
  assert.match(migration, /valid_price_rate/);
  assert.match(migration, /wpi_price_collection_schedule_policies/);
  assert.match(migration, /when '每月'/);
  assert.match(migration, /drop function if exists public\.wpi_search_price_collection_leads_v3/);
  assert.match(migration, /wpi_record_equipment_access_event[\s\S]*from public, anon, authenticated/);
  assert.match(taskDetail, /来源质量指标/);
  assert.match(taskDetail, /有效价格率/);
  assert.match(schedulePanel, /品类采集周期/);
  assert.match(schedulePanel, /schedule_policy/);
  assert.match(apiRoute, /wpi_apply_price_collection_schedule_policy/);
  assert.equal(sourceFiles.some((source) => source.includes("wpi_search_price_collection_leads_v3")), false);
});

test("价格采集按精确所属月份缩小请求并在入池前统一拦截", async () => {
  const collectionPage = await read("src/app/ai-price-collection/page.tsx");
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");

  assert.match(collectionPage, /pricePeriodFrom: "2026-01"/);
  assert.match(collectionPage, /pricePeriodToMode: "current_month"/);
  assert.match(collectionPage, /排除无法识别价格月份的数据/);
  assert.match(worker, /function taloPricePeriods/);
  assert.match(worker, /function candidatePricePeriodDecision/);
  assert.match(worker, /before_range/);
  assert.match(worker, /after_range/);
  assert.match(worker, /unknown_date/);
  assert.match(worker, /filteredByPricePeriodCount/);
  assert.ok(
    (worker.match(/candidatePricePeriodDecision\(candidate, task\)/g) || []).length >= 2,
    "CAID 文档与普通网页候选都必须在入池前执行所属期校验",
  );
});

test("报价识别验收样本可被真实解析器识别并保留风险字段", async () => {
  const { parseQuoteFile } =
    await import("../src/lib/imports/quoteRecognitionParser.ts");
  const bytes = await read("scripts/fixtures/quote-recognition-sample.csv");
  const buffer = Buffer.from(bytes, "utf8");
  const parsed = await parseQuoteFile({
    fileName: "quote-recognition-sample.csv",
    mimeType: "text/csv",
    bytes: buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  });

  assert.equal(parsed.items.length, 3);
  assert.equal(parsed.summary.rowCount, 3);
  assert.equal(parsed.summary.totalAmount, 67_676_000);
  assert.ok(parsed.summary.overallConfidence >= 80);
  assert.ok(
    parsed.items.every((item) => item.confidence > 0 && item.riskLevel),
  );
  assert.ok(
    parsed.items.every(
      (item) => item.evidence.sourceKind === "spreadsheet_row",
    ),
  );
});

test("自动化状态迁移会回收孤立 AI 运行并撤销未审核套价", async () => {
  const migration = await read(
    "supabase/migrations/20260829104359_reconcile_stale_automation_state.sql",
  );

  assert.match(migration, /AI_GATEWAY_RUN_STALE/);
  assert.match(
    migration,
    /created_at\s*<\s*now\(\)\s*-\s*interval\s*'30 minutes'/i,
  );
  assert.match(migration, /wpi-reconcile-stale-ai-gateway-runs/);
  assert.match(migration, /SOURCE_PRICE_NOT_APPROVED/);
  assert.match(migration, /decision_status\s*=\s*'gap'/);
});

test("安全与性能迁移优化 RLS 并补齐外键索引", async () => {
  const migration = await read(
    "supabase/migrations/20260829105641_harden_rls_and_foreign_key_indexes.sql",
  );

  assert.match(
    migration,
    /revoke all on function public\.wpi_set_integration_credential.*from public, anon/i,
  );
  assert.match(migration, /created_by\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(migration, /drop policy wpi_inbound_emails_write/i);
  assert.match(migration, /create policy wpi_inbound_emails_update/i);
  assert.match(
    migration,
    /constraint_row\.conkey\s*<@\s*\(index_row\.indkey::smallint\[\]\)/i,
  );

  const leadingIndexes = await read(
    "supabase/migrations/20260829110125_complete_foreign_key_leading_indexes.sql",
  );
  assert.equal(
    (leadingIndexes.match(/create index if not exists/g) ?? []).length,
    19,
  );
  assert.match(leadingIndexes, /wpi_inquiry_events \(inquiry_id\)/);
  assert.match(
    leadingIndexes,
    /wpi_project_pricing_items \(equipment_catalog_id\)/,
  );
});

test("采集线索入库保留价格口径且地材详情只展示真实证据", async () => {
  const detailPage = await read("src/app/material-prices/[id]/page.tsx");
  const migration = await read(
    "supabase/migrations/20260901172436_preserve_collection_price_provenance.sql",
  );

  assert.equal(detailPage.includes("报价单_KBM_20250516.pdf"), false);
  assert.equal(detailPage.includes("低于均价 8.6%"), false);
  assert.equal(detailPage.includes("MAT-2025-00456"), false);
  assert.match(detailPage, /wpi_attachments/);
  assert.match(detailPage, /wpi_price_collection_evidence/);
  assert.match(detailPage, /暂无真实附件或采集证据/);
  assert.match(detailPage, /系统不生成涨跌预测/);

  assert.match(migration, /'quoteDate'/);
  assert.match(migration, /'pricePeriodGranularity'/);
  assert.match(migration, /'normalizedPriceCny'/);
  assert.match(migration, /'exchangeRate'/);
  assert.match(migration, /'fxStatus'/);
  assert.match(migration, /'evidenceIds'/);
  assert.match(migration, /'usdPrice'/);
  assert.match(migration, /normalized_usd_price/);
  assert.match(migration, /wpi_currency_rates/);
});

test("价格线索重新核验准入会真实访问来源且失败不刷新有效期", async () => {
  const apiRoute = await read("src/app/api/price-collection/route.ts");
  const workspace = await read(
    "src/components/price-leads/PriceLeadsWorkspace.tsx",
  );

  assert.match(apiRoute, /verifyCollectionSource/);
  assert.match(apiRoute, /validate_api_integration/);
  assert.match(apiRoute, /asText\(lead\.source_url\) \|\| asText\(source\?\.base_url\)/);
  assert.match(apiRoute, /source_checked_at:\s*verification\.checkedAt/);
  assert.match(apiRoute, /admissionValidation:\s*verification\.result/);
  assert.match(apiRoute, /status:\s*"failed"/);
  assert.match(apiRoute, /status:\s*failed\.length \? 207 : 200/);
  assert.equal(
    apiRoute.includes("source_checked_at: lead.source_checked_at"),
    false,
  );
  assert.match(workspace, /部分来源核验失败/);
  assert.match(workspace, /失败线索未刷新来源有效期/);
  assert.match(workspace, /已真实访问并验证/);

  const validator = await read(
    "src/lib/priceCollection/sourceValidator.ts",
  );
  assert.match(validator, /application\/pdf/);
  assert.match(validator, /spreadsheetml\.sheet/);
});

test("P0 采集运行区分父任务与来源尝试且只向页面返回父运行", async () => {
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");
  const migration = await read(
    "supabase/migrations/20260901192915_fix_collection_run_hierarchy_p0.sql",
  );
  const collectionRoute = await read("src/app/api/price-collection/route.ts");
  const taskRoute = await read("src/app/api/price-collection/tasks/[id]/route.ts");

  assert.match(worker, /run_kind:\s*"parent"/);
  assert.match(worker, /run_kind:\s*"source_attempt"/);
  assert.match(worker, /parent_run_id:\s*sourceRun\.parent_run_id/);
  assert.match(worker, /source_run_id:\s*sourceRun\.id/);
  assert.match(migration, /run_kind = 'parent'/);
  assert.match(migration, /reconciledSourceAttempts/);
  assert.ok(
    (collectionRoute.match(/\.eq\("run_kind", "parent"\)/g) ?? []).length >= 3,
  );
  assert.ok((taskRoute.match(/\.eq\("run_kind", "parent"\)/g) ?? []).length >= 3);
});

test("P0 正式价格以真实证据为准并保证线索幂等入库", async () => {
  const migration = await read(
    "supabase/migrations/20260901193104_fix_formal_price_admission_p0.sql",
  );

  assert.match(migration, /wpi_sync_collection_lead_evidence_code/);
  assert.match(migration, /actual_evidence_code/);
  assert.match(migration, /'evidenceIds', actual_evidence_ids/);
  assert.match(migration, /'normalizedBusinessUnit', '根'/);
  assert.match(migration, /wpi_material_prices_collection_lead_unique/);
  assert.match(migration, /wpi_equipment_prices_collection_lead_unique/);
});

test("P0 AI 任务入队前校验模型提示词与 Provider 运行状态", async () => {
  const gateway = await read("supabase/functions/wpi-ai-gateway/index.ts");

  assert.match(gateway, /async function assertWorkflowReady/);
  assert.match(gateway, /AI_HUMAN_REVIEW_POLICY_REQUIRED/);
  assert.match(gateway, /AI_MODEL_WORKFLOW_DISABLED/);
  assert.match(gateway, /AI_PROMPT_DISABLED/);
  assert.match(gateway, /AI_INTEGRATION_NOT_VALIDATED/);
  assert.match(gateway, /await assertWorkflowReady\(adminClient, organizationId, body\.workflowKey\)/);
  assert.match(gateway, /尚未通过运行校验/);
});

test("P0 本地 Edge Function 声明覆盖远端自动化函数", async () => {
  const config = await read("supabase/config.toml");
  const functionNames = [
    "wpi-ai-gateway",
    "wpi-price-collector",
    "wpi-supplier-quote-portal",
    "wpi-inquiry-reminder-runner",
    "wpi-equipment-document-worker",
    "wpi-inquiry-mailer",
    "wpi-inquiry-email-webhook",
    "wpi-user-management",
  ];

  for (const functionName of functionNames) {
    assert.match(config, new RegExp(`\\[functions\\.${functionName}\\]`));
  }
  assert.match(
    config,
    /\[functions\.wpi-inquiry-reminder-runner\][\s\S]*?verify_jwt = false/,
  );
});

test("P1 自动化健康快照覆盖工作流、集成、Cron 与采集运行", async () => {
  const migration = await read(
    "supabase/migrations/20260901195556_ai_automation_operations_p1.sql",
  );
  const api = await read("src/app/api/ai/operations/route.ts");
  const panel = await read(
    "src/components/ai-workflow/AiAutomationOperationsPanel.tsx",
  );
  const workbench = await read("src/app/ai-workbench/page.tsx");

  assert.match(migration, /wpi_get_ai_automation_health/);
  assert.match(migration, /wpi_organization_members/);
  assert.match(migration, /ORGANIZATION_ACCESS_DENIED/);
  assert.match(migration, /workflowTotal', 7/);
  assert.match(migration, /wpi-price-collection-due/);
  assert.match(migration, /wpi-inquiry-reminders-due/);
  assert.match(migration, /wpi-reconcile-stale-ai-gateway-runs/);
  assert.match(migration, /run\.run_kind = 'source_attempt'/);
  assert.match(migration, /Historical task failures|Historical task/i);
  assert.match(api, /rpc\("wpi_get_ai_automation_health"/);
  assert.match(api, /target_organization_id: access\.organizationId/);
  assert.match(panel, /自动化运行健康/);
  assert.match(panel, /查看失败任务/);
  assert.match(panel, /\/settings\/integrations/);
  assert.match(workbench, /fetch\("\/api\/ai\/operations"/);
  assert.match(workbench, /useVisiblePolling\(async \(signal\) => \{ await loadAutomationHealth\(true, signal\); return true; \}, 60_000\)/);
  assert.doesNotMatch(workbench, /setInterval/);
  assert.match(workbench, /setStatus\("needs_info"\)/);
});

test("P2 持续保障持久化巡检、事件防抖、恢复通知与留存", async () => {
  const migration = await read(
    "supabase/migrations/20260902074807_ai_automation_continuous_assurance_p2.sql",
  );
  const api = await read("src/app/api/ai/operations/route.ts");
  const panel = await read(
    "src/components/ai-workflow/AiAutomationOperationsPanel.tsx",
  );

  assert.match(migration, /wpi_automation_health_snapshots/);
  assert.match(migration, /wpi_automation_incidents/);
  assert.match(migration, /recent_nonhealthy = 2/);
  assert.match(migration, /recent_healthy = 2/);
  assert.match(migration, /interval '90 days'/);
  assert.match(migration, /'\*\/15 \* \* \* \*'/);
  assert.match(migration, /automation:health-incident/);
  assert.match(migration, /on conflict \(organization_id, recipient_id, dedupe_key\)/);
  assert.match(migration, /wpi_automation_health_snapshots_read/);
  assert.match(migration, /wpi_automation_incidents_read/);
  assert.match(api, /wpi_automation_health_snapshots/);
  assert.match(api, /wpi_automation_incidents/);
  assert.match(api, /intervalMinutes: 15/);
  assert.match(api, /retentionDays: 90/);
  assert.match(api, /30 \* 60 \* 1000/);
  assert.match(api, /enabled: assuranceFresh/);
  assert.match(panel, /持续保障/);
  assert.match(panel, /当前无未关闭运行事件/);
});

test("P0 自动化闭环兼容重复证据并正确识别 partial 终态", async () => {
  const migration = await read(
    "supabase/migrations/20260902084527_close_agent_automation_p0.sql",
  );
  const identityMigration = await read(
    "supabase/migrations/20260902085152_unify_collection_evidence_identity.sql",
  );
  const worker = await read("supabase/functions/wpi-price-collector/index.ts");

  assert.match(migration, /wpi_ingest_price_collection_candidate/);
  assert.match(migration, /'on conflict'/);
  assert.match(migration, /wpi_get_ai_automation_health/);
  assert.match(migration, /run\.status in \('queued', 'running'\)/);
  assert.match(migration, /wpi_reconcile_stale_price_collection_runs/);
  assert.match(migration, /parent_run\.status in \('queued', 'running'\)/);
  assert.match(identityMigration, /subject_identity := coalesce\(new\.lead_id::text, 'unlinked'\)/);
  assert.match(identityMigration, /drop constraint if exists wpi_price_collection_evidence_org_task_content_hash_key/);
  assert.match(identityMigration, /on conflict \(organization_id, task_id, observation_key\)/);
  assert.equal(worker.includes('onConflict: "organization_id,task_id,content_hash"'), false);
  assert.ok((worker.match(/onConflict: "organization_id,task_id,observation_key"/g) ?? []).length >= 2);
});

test("P0 BOQ 解析自动进入统一 AI 网关且失败可见", async () => {
  const route = await read("src/app/api/project-pricing/[id]/parse/route.ts");
  const page = await read("src/app/project-pricing/page.tsx");

  assert.match(route, /workflowKey:\s*"boq_parsing"/);
  assert.match(route, /idempotencyKey:\s*`boq-parsing-/);
  assert.match(route, /requiresHumanReview|不得直接确认套价/);
  assert.match(route, /aiBoqTaskId/);
  assert.match(route, /aiQueueError/);
  assert.match(page, /AI 复核未排队/);
  assert.match(page, /AI 复核任务已排队/);
});

test("P0 询价邮件发送前实时核验 Resend 发件域名", async () => {
  const mailer = await read("supabase/functions/wpi-inquiry-mailer/index.ts");
  const sendRoute = await read("src/app/api/inquiries/[id]/send/route.ts");

  assert.match(mailer, /verifyResendSenderDomain/);
  assert.match(mailer, /EMAIL_SENDER_DOMAIN_NOT_VERIFIED/);
  assert.match(mailer, /EMAIL_SENDER_DOMAIN_UNVERIFIABLE/);
  assert.match(mailer, /domain\.status\?\.toLowerCase\(\) !== "verified"/);
  assert.match(sendRoute, /action:\s*"validate"/);
  assert.match(sendRoute, /邮件域名或公开门户未通过实时校验/);
});

test("P1 自动化运维展示真实业务运行并覆盖持续保障 Cron", async () => {
  const migration = await read(
    "supabase/migrations/20260902090544_automation_operations_information_p1.sql",
  );
  const listMigration = await read(
    "supabase/migrations/20260902090852_include_assurance_cron_in_operations_list.sql",
  );
  const api = await read("src/app/api/ai/operations/route.ts");
  const panel = await read(
    "src/components/ai-workflow/AiAutomationOperationsPanel.tsx",
  );

  assert.match(migration, /wpi-capture-automation-health/);
  assert.match(migration, /wpi_get_ai_automation_health/);
  assert.match(listMigration, /returned operations list/);
  assert.match(listMigration, /wpi-capture-automation-health/);
  assert.match(api, /wpi_ai_execution_tasks/);
  assert.match(api, /successStatuses/);
  assert.match(api, /lastRunStatus/);
  assert.match(api, /failures24h/);
  assert.match(api, /latestFailureMessage/);
  assert.match(panel, /最近运行/);
  assert.match(panel, /正式落库/);
  assert.match(panel, /最近采集失败/);
  assert.match(panel, /\/settings\/integrations\?type=email/);
});

test("P2 持续保障按组件防抖开关事件并提供修复入口", async () => {
  const migration = await read(
    "supabase/migrations/20260902092047_component_level_automation_assurance_p2.sql",
  );
  const api = await read("src/app/api/ai/operations/route.ts");
  const refinement = await read(
    "supabase/migrations/20260902092323_refine_component_assurance_states.sql",
  );
  const panel = await read(
    "src/components/ai-workflow/AiAutomationOperationsPanel.tsx",
  );

  assert.match(migration, /wpi_automation_component_states/);
  assert.match(migration, /consecutive_failures/);
  assert.match(migration, /consecutive_successes/);
  assert.match(migration, /next_failures >= 2/);
  assert.match(migration, /next_successes >= 2/);
  assert.match(migration, /'component:' \|\| component_row\.component_key/);
  assert.match(migration, /wpi_run_automation_assurance/);
  assert.match(migration, /private\.wpi_is_org_member/);
  assert.match(refinement, /备用集成未启用，不参与当前自动化运行/);
  assert.match(refinement, /等待首次调度记录/);
  assert.match(api, /wpi_automation_component_states/);
  assert.match(api, /remediationHref/);
  assert.match(panel, /待处理组件/);
  assert.match(panel, /自动化组件全部正常/);
});

test("自动化健康检查不把运行中的 Cron 误报为失败", async () => {
  const migration = await read(
    "supabase/migrations/20260902093741_exclude_running_cron_from_failures.sql",
  );

  assert.match(migration, /details\.status not in \('succeeded', 'running'\)/);
  assert.match(migration, /wpi_get_ai_automation_health/);
});

test("P1/P2 自动化矩阵展示四阶段并执行每日冒烟保障", async () => {
  const migration = await read(
    "supabase/migrations/20260902101807_automation_matrix_and_daily_smoke_assurance.sql",
  );
  const api = await read("src/app/api/ai/operations/route.ts");
  const panel = await read(
    "src/components/ai-workflow/AiAutomationOperationsPanel.tsx",
  );

  assert.match(migration, /wpi_get_ai_automation_matrix/);
  assert.match(migration, /wpi_automation_smoke_cases/);
  assert.match(migration, /wpi_automation_smoke_runs/);
  assert.match(migration, /wpi-daily-automation-smoke/);
  assert.match(migration, /next_failures >= 2/);
  assert.match(migration, /next_successes >= 2/);
  assert.match(migration, /status = 'resolved'/);
  assert.match(api, /wpi_get_ai_automation_matrix/);
  assert.match(panel, /配置就绪/);
  assert.match(panel, /最近运行/);
  assert.match(panel, /人工审核/);
  assert.match(panel, /正式落库/);
  assert.match(panel, /每日冒烟/);
});

test("附件证据 P0/P1/P2 强制审核门禁、工作队列与持续治理", async () => {
  const migration = await read(
    "supabase/migrations/20260902111946_attachment_review_queue_governance.sql",
  );
  const healthMigration = await read(
    "supabase/migrations/20260902115338_register_attachment_governance_health.sql",
  );
  const page = await read("src/app/attachments/page.tsx");
  const listApi = await read("src/app/api/attachments/route.ts");
  const actionsApi = await read("src/app/api/attachments/actions/route.ts");
  const reviewApi = await read("src/app/api/attachments/[id]/review/route.ts");

  assert.match(migration, /ATTACHMENT_RELATION_REQUIRED/);
  assert.match(migration, /ATTACHMENT_AI_REVIEW_REQUIRED/);
  assert.match(migration, /ATTACHMENT_OPEN_ISSUES/);
  assert.match(migration, /ATTACHMENT_DUPLICATE_UNRESOLVED/);
  assert.match(migration, /ATTACHMENT_HIGH_RISK_JUSTIFICATION_REQUIRED/);
  assert.match(migration, /wpi_set_attachment_relation/);
  assert.match(migration, /wpi_assign_attachments/);
  assert.match(migration, /wpi-attachment-governance/);
  assert.match(healthMigration, /wpi-attachment-governance/);
  assert.match(listApi, /count: "exact"/);
  assert.match(listApi, /review_state/);
  assert.match(actionsApi, /ai_review/);
  assert.match(actionsApi, /assign/);
  assert.match(reviewApi, /humanizeReviewError/);
  assert.match(page, /附件审核队列/);
  assert.match(page, /待 AI 预审/);
  assert.match(page, /待人工审核/);
  assert.match(page, /审核截止/);
  assert.match(page, /批量 AI 预审/);
  assert.match(page, /分派审核负责人/);
  assert.match(page, /确认门禁尚未通过/);
  assert.match(page, /第 \{page\} \/ \{totalPages\} 页/);
  assert.match(page, /crypto\.subtle\.digest/);
  assert.equal(page.includes('decision: "confirmed", notes: "附件库人工确认'), false);
});

test("统计分析 P0 按价格所属期统一范围并使用标准化价格", async () => {
  const api = await read("src/app/api/analytics/route.ts");
  const page = await read("src/app/analytics/page.tsx");
  const types = await read("src/types/analytics.ts");

  assert.match(api, /row\.metadata\?\.quoteDate/);
  assert.match(api, /row\.quote_date/);
  assert.match(api, /positiveNumber\(row\.usd_price\)/);
  assert.match(api, /positiveNumber\(row\.metadata\?\.usdPrice\)/);
  assert.match(api, /eq\("review_status", "approved"\)/);
  assert.match(api, /function median/);
  assert.match(api, /const riskRows = \[/);
  assert.match(api, /periodStart:/);
  assert.match(api, /function buildComparableIndex/);
  assert.match(api, /equipmentComparableKey/);
  assert.match(api, /materialComparableKey/);
  assert.match(api, /缺失记录不进入区间与趋势统计/);
  assert.match(page, /同口径可比价格指数/);
  assert.match(page, /未进入区间与趋势统计/);
  assert.match(page, /暂无可比价格趋势/);
  assert.match(page, /价格所属日期/);
  assert.match(page, /数据达到查询上限/);
  assert.match(types, /equipmentSamples: number/);
  assert.match(types, /normalizedCurrency: "USD"/);
  assert.match(types, /comparableBasketCount: number/);
  assert.match(types, /missingPriceDateCount: number/);
});

test("统计分析 P0 阻断不合格决策并持久化整改任务", async () => {
  const migration = await read("supabase/migrations/20260902193244_analytics_decision_readiness_actions_p0.sql");
  const api = await read("src/app/api/analytics/route.ts");
  const actions = await read("src/app/api/analytics/actions/route.ts");
  const page = await read("src/app/analytics/page.tsx");
  const types = await read("src/types/analytics.ts");

  assert.match(migration, /wpi_analytics_action_items/);
  assert.match(migration, /private\.wpi_is_org_member/);
  assert.match(migration, /array\['admin', 'manager'\]/);
  assert.match(api, /decisionReadiness/);
  assert.match(api, /periodFormalPriceCount/);
  assert.match(api, /不可用于经营决策/);
  assert.match(api, /const riskRows = \[\.\.\.equipmentData, \.\.\.materialData\]/);
  assert.match(api, /leadRiskSummary/);
  assert.match(api, /business_object_type,business_object_id,input_target_type:input_payload->targetType/);
  assert.match(api, /input_payload: \{ targetType: row.input_target_type \}/);
  assert.match(api, /wpi_inquiries\(wpi_inquiry_items\(item_type\)\)/);
  assert.match(actions, /当前角色没有创建统计整改任务的权限/);
  assert.match(actions, /status === "resolved"/);
  assert.match(page, /尚未创建整改任务/);
  assert.match(page, /创建整改任务/);
  assert.match(page, /正式价格风险分布/);
  assert.match(page, /价格可信度 暂无样本/);
  assert.match(page, /响应与有效报价率不参与绩效判断/);
  assert.match(types, /status: "ready" \| "warning" \| "blocked"/);
});

test("统计分析 P1 按对象重算并携带业务钻取条件", async () => {
  const api = await read("src/app/api/analytics/route.ts");
  const page = await read("src/app/analytics/page.tsx");
  const panel = await read("src/components/round8d/AnalyticsRound8DPanel.tsx");
  const leads = await read("src/components/price-leads/PriceLeadsWorkspace.tsx");
  const materials = await read("src/app/material-prices/page.tsx");
  const equipmentApi = await read("src/app/api/equipment-prices/route.ts");
  const inquiries = await read("src/components/inquiries/InquiryManagementCenter.tsx");

  assert.match(api, /requestedObjectType/);
  assert.match(api, /target_type/);
  assert.match(api, /objectType === "material" \? \[\] : periodEquipment/);
  assert.match(api, /matchesObjectType\(inquiryObjectTypes\(row\.wpi_inquiry_items\), objectType\)/);
  assert.match(api, /formalRiskSummary/);
  assert.match(api, /label: "区间合作供应商"/);
  assert.match(page, /params\.set\("dateFrom"/);
  assert.match(page, /params\.set\("dateTo"/);
  assert.match(page, /params\.set\("objectType"/);
  assert.match(panel, /onObjectTypeChange/);
  assert.match(leads, /const dateTo = searchParams\.get\("dateTo"\)/);
  assert.match(materials, /materialDateInRange\(row\.quoteDate, filters\.dateFrom, filters\.dateTo\)/);
  const materialDates = await read("src/lib/data/materialInsights.ts");
  assert.match(materialDates, /const date = materialDate\(value\)/);
  assert.match(materialDates, /!from \|\| date >= from/);
  assert.match(materialDates, /!to \|\| date <= to/);
  assert.match(equipmentApi, /metadata->>quoteDate/);
  assert.match(inquiries, /searchParams\.get\("startDate"\) \|\| searchParams\.get\("dateFrom"\)/);
  assert.match(inquiries, /searchParams\.get\("objectType"\)/);
  const inquiryApi = await read("src/app/api/inquiries/route.ts");
  assert.match(inquiryApi, /\.eq\("item_type", objectType\)/);
  assert.match(inquiryApi, /supplierLinksQuery = supplierLinksQuery\.in\("inquiry_id", scopeIds\)/);
  assert.match(inquiryApi, /taskSummaryQuery = taskSummaryQuery\.gte\("created_at", startAt\)/);
  assert.match(page, /询价任务环比/);
  assert.match(page, /待审线索风险/);
});

test("统计分析 P1 使用全量经营口径并形成责任闭环", async () => {
  const api = await read("src/app/api/analytics/route.ts");
  const page = await read("src/app/analytics/page.tsx");
  const types = await read("src/types/analytics.ts");

  assert.match(api, /equipment_price_pre_review/);
  assert.match(api, /price_collection/);
  assert.match(api, /inquiry_letter/);
  assert.match(api, /analyticsWorkflowKeys\.map/);
  assert.match(api, /supplierResponseSummary/);
  assert.match(api, /percent\(supplierReplied, supplierSent\)/);
  assert.match(api, /ownerRole: "价格审核负责人"/);
  assert.match(api, /deadline: deadlineFrom/);
  assert.match(page, /全量加权响应率/);
  assert.match(page, /有效报价率/);
  assert.match(page, /责任：/);
  assert.match(page, /完成期限/);
  assert.match(page, /运行保障/);
  assert.match(types, /noResponseSupplierCount: number/);
  assert.match(types, /needsReview: number/);
});

test("统计分析 P2 持续巡检并自动管理数据质量事件", async () => {
  const migration = await read("supabase/migrations/20260902160922_analytics_operational_assurance_p2.sql");
  const approvedHealthMigration = await read("supabase/migrations/20260902185636_analytics_approved_health_scope_p0.sql");
  const api = await read("src/app/api/analytics/route.ts");
  const page = await read("src/app/analytics/page.tsx");
  const types = await read("src/types/analytics.ts");

  assert.match(migration, /wpi_capture_analytics_health/);
  assert.match(migration, /runtime:analytics-aggregation/);
  assert.match(migration, /next_failures >= 2/);
  assert.match(migration, /next_successes >= 2/);
  assert.match(migration, /analytics:health-incident/);
  assert.match(migration, /wpi_run_automation_assurance/);
  assert.match(approvedHealthMigration, /equipment\.review_status = 'approved'/);
  assert.match(approvedHealthMigration, /material\.review_status = 'approved'/);
  assert.match(approvedHealthMigration, /missingPriceDateCount/);
  assert.match(api, /query-completeness/);
  assert.match(api, /price-date-coverage/);
  assert.match(api, /trend-samples/);
  assert.match(page, /数据运行保障/);
  assert.match(page, /后台巡检在线/);
  assert.match(page, /查看运行事件/);
  assert.match(page, /全库连续异常/);
  assert.match(types, /scopeLabel: string/);
  assert.match(types, /monitoringEnabled: boolean/);
});
