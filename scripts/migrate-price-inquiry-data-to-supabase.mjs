import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator).trim(),
          line
            .slice(separator + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}

function compileTypescript(relativePath, runtimeImports = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const commonJsModule = { exports: {} };

  vm.runInNewContext(output, {
    module: commonJsModule,
    exports: commonJsModule.exports,
    require(specifier) {
      if (specifier in runtimeImports) return runtimeImports[specifier];
      throw new Error(`Unexpected runtime import ${specifier} in ${relativePath}`);
    },
  });

  return commonJsModule.exports;
}

function confidenceScore(level) {
  return { A: 95, B: 85, C: 75, D: 65, E: 50 }[level] ?? 60;
}

function normalizeRisk(value) {
  return ["low", "medium", "high", "critical"].includes(value) ? value : "medium";
}

function inquiryStatus(value) {
  if (value === "completed" || value === "confirmed") return "approved";
  if (value === "rejected" || value === "voided") return "rejected";
  if (value === "created") return "draft";
  return "pending_review";
}

function dateTime(value, hour = "17:00:00") {
  if (!value) return null;
  if (value.includes("T")) return value;
  return `${value}T${hour}+08:00`;
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[（）()·,，.\s]/g, "")
    .replace(/股份有限公司|有限责任公司|有限公司|集团|实业|水泵|泵业|公司/g, "");
}

function findSupplier(suppliers, name) {
  const target = normalizeName(name);
  if (!target) return null;

  return (
    suppliers.find((supplier) => {
      const candidates = [
        supplier.name,
        supplier.legal_name,
        supplier.metadata?.supplierName,
        supplier.metadata?.englishName,
      ]
        .filter(Boolean)
        .map(normalizeName);
      return candidates.some(
        (candidate) =>
          candidate === target ||
          (candidate.length >= 4 &&
            target.length >= 4 &&
            (candidate.includes(target) || target.includes(candidate))),
      );
    }) ?? null
  );
}

function findSourcePrice(rows, item) {
  return (
    rows.find(
      (row) =>
        row.legacy_id === item.targetId ||
        row.price_code === item.targetId ||
        row.metadata?.equipmentCode === item.targetId ||
        row.metadata?.materialCode === item.targetId,
    ) ?? null
  );
}

function inquirySupplierKeywords(task) {
  const text = `${task?.subject ?? ""} ${task?.relatedItem ?? ""}`;
  if (/泵|泵站/.test(text)) return ["泵", "水泵", "供水"];
  if (/阀|管件/.test(text)) return ["阀", "管件", "管道"];
  if (/加药|PAM|PAC|絮凝/.test(text)) return ["加药", "药剂", "水处理"];
  if (/消毒|紫外/.test(text)) return ["消毒", "紫外", "水处理"];
  if (/配电|控制柜|电气/.test(text)) return ["电气", "配电", "自动化", "控制"];
  if (/活性炭|滤料/.test(text)) return ["活性炭", "滤料", "过滤"];
  return ["水处理", "设备"];
}

function candidateSuppliers(suppliers, task, limit = 3) {
  const keywords = inquirySupplierKeywords(task);
  const matching = suppliers.filter((supplier) => {
    const text = JSON.stringify({
      name: supplier.name,
      legalName: supplier.legal_name,
      metadata: supplier.metadata,
    }).toLowerCase();
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });

  return (matching.length > 0 ? matching : suppliers).slice(0, limit);
}

const fileEnv = readEnvFile(path.join(root, ".env.local"));
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_SEED_EMAIL;
const password = process.env.SUPABASE_SEED_PASSWORD;

if (!supabaseUrl || !supabaseKey || !email || !password) {
  throw new Error(
    "Missing Supabase configuration. Set SUPABASE_SEED_EMAIL and SUPABASE_SEED_PASSWORD.",
  );
}

const equipmentModule = compileTypescript("src/data/mock/equipmentPrices.ts");
const materialModule = compileTypescript("src/data/mock/materialPrices.ts");
const inquiryModule = compileTypescript("src/data/mock/inquiries.ts");
const importedSupplierModule = compileTypescript(
  "src/data/mock/importedKanangaSuppliers.ts",
);
const inquiryDetailModule = compileTypescript(
  "src/data/mock/inquiryDetails.ts",
  {
    "./inquiries": inquiryModule,
    "./equipmentPrices": equipmentModule,
    "./materialPrices": materialModule,
    "./suppliers": {
      supplierRecords: importedSupplierModule.importedKanangaSuppliers,
    },
  },
);

const equipmentRecords = equipmentModule.equipmentPriceRecords;
const materialRecords = materialModule.materialPriceRecords;
const inquiryRecords = inquiryModule.inquiryTaskRecords;
const inquiryDetails = inquiryDetailModule.inquiryDetails;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: authData, error: authError } =
  await supabase.auth.signInWithPassword({ email, password });
if (authError || !authData.user) {
  throw authError ?? new Error("Administrator sign-in failed.");
}

const { data: membership, error: membershipError } = await supabase
  .from("wpi_organization_members")
  .select("organization_id, role")
  .eq("user_id", authData.user.id)
  .eq("is_active", true)
  .single();
if (membershipError || !membership) {
  throw membershipError ?? new Error("No active organization membership.");
}

const organizationId = membership.organization_id;
const userId = authData.user.id;
const importedAt = new Date().toISOString();

const { data: suppliers, error: supplierError } = await supabase
  .from("wpi_suppliers")
  .select("id, name, legal_name, metadata")
  .eq("organization_id", organizationId);
if (supplierError) throw supplierError;

const equipmentRows = equipmentRecords.map((record) => ({
  organization_id: organizationId,
  legacy_id: record.id,
  price_code: record.equipmentCode,
  equipment_name: record.equipmentName,
  brand: record.brand || null,
  model: record.specification || null,
  category: record.category || null,
  original_price: record.originalPrice,
  original_currency: record.currency,
  usd_price: record.usdPrice,
  price_term: record.priceCondition || null,
  supplier_id: findSupplier(suppliers, record.supplier)?.id ?? null,
  source_type: record.sourceType || null,
  source_url: null,
  valid_until: null,
  confidence: confidenceScore(record.confidence),
  risk_level: normalizeRisk(record.riskLevel),
  review_status: "pending_review",
  technical_parameters: {
    specification: record.specification,
    unit: record.unit,
  },
  metadata: {
    ...record,
    migration: {
      importedAt,
      originalReviewStatus: record.reviewStatus,
      reviewRequired: true,
    },
  },
  created_by: userId,
  updated_by: userId,
}));

const { data: equipmentData, error: equipmentError } = await supabase
  .from("wpi_equipment_prices")
  .upsert(equipmentRows, { onConflict: "organization_id,price_code" })
  .select("id, legacy_id, price_code, metadata");
if (equipmentError) throw equipmentError;

const materialRows = materialRecords.map((record) => ({
  organization_id: organizationId,
  legacy_id: record.id,
  price_code: record.materialCode,
  material_name: record.materialName,
  specification: record.specification || null,
  category: record.category || null,
  unit: record.unit,
  price: record.originalPrice,
  currency: record.currency,
  region: record.region || null,
  supplier_id: findSupplier(suppliers, record.supplierName)?.id ?? null,
  source_type: record.source || null,
  source_url: null,
  valid_until: record.validUntil || null,
  confidence: confidenceScore(record.confidence),
  risk_level: normalizeRisk(record.riskLevel),
  review_status: "pending_review",
  metadata: {
    ...record,
    migration: {
      importedAt,
      originalReviewStatus: record.reviewStatus,
      reviewRequired: true,
    },
  },
  created_by: userId,
  updated_by: userId,
}));

const { data: materialData, error: materialError } = await supabase
  .from("wpi_material_prices")
  .upsert(materialRows, { onConflict: "organization_id,price_code" })
  .select("id, legacy_id, price_code, metadata");
if (materialError) throw materialError;

const inquiryRows = inquiryRecords.map((record) => {
  const detail = inquiryDetails.find(
    (item) => item.id === record.inquiryCode || item.id === record.id,
  );

  return {
    organization_id: organizationId,
    legacy_id: record.id,
    inquiry_code: record.inquiryCode,
    subject: record.subject,
    status: inquiryStatus(record.status),
    deadline: dateTime(record.deadline),
    letter_content: detail?.letter
      ? [
          detail.letter.projectBackground,
          ...detail.letter.technicalRequirements,
          ...detail.letter.quoteRequirements,
        ].join("\n")
      : null,
    ai_confidence: detail?.aiConfidence ?? null,
    risk_level: normalizeRisk(record.riskLevel),
    metadata: {
      ...record,
      detail: detail ?? null,
      migration: { importedAt, source: "existing_inquiry_mock" },
    },
    created_by: userId,
    updated_by: userId,
  };
});

const { data: inquiryData, error: inquiryError } = await supabase
  .from("wpi_inquiries")
  .upsert(inquiryRows, { onConflict: "organization_id,inquiry_code" })
  .select("id, legacy_id, inquiry_code, metadata");
if (inquiryError) throw inquiryError;

let inquiryItemCount = 0;
let inquirySupplierCount = 0;

for (const inquiry of inquiryData) {
  const task = inquiryRecords.find(
    (record) =>
      record.id === inquiry.legacy_id ||
      record.inquiryCode === inquiry.inquiry_code,
  );
  const detail = inquiryDetails.find(
    (item) =>
      item.id === inquiry.inquiry_code || item.id === inquiry.legacy_id,
  );
  const items =
    detail?.items?.length > 0
      ? detail.items
      : [
          {
            id: `${inquiry.legacy_id}-ITEM-001`,
            targetId: null,
            targetType: /钢|水泥|砂|管|滤料|PAM|材料/.test(task?.relatedItem ?? "")
              ? "material"
              : "equipment",
            name: task?.relatedItem ?? task?.subject ?? "待补全询价对象",
            specification: null,
            unit: "项",
            quantity: 1,
            referencePrice: task?.lowestQuote || null,
            currency: task?.currency ?? "USD",
            source: "询价任务摘要",
            confidenceLevel: "C",
            riskLevel: task?.riskLevel ?? "medium",
          },
        ];

  for (const item of items) {
    const sourceRows =
      item.targetType === "equipment" ? equipmentData : materialData;
    const sourcePrice = findSourcePrice(sourceRows, item);
    const legacyId = `${inquiry.inquiry_code}:${item.id}`;
    const itemRow = {
      organization_id: organizationId,
      inquiry_id: inquiry.id,
      legacy_id: legacyId,
      item_type: item.targetType,
      source_id: sourcePrice?.id ?? null,
      item_name: item.name,
      specification: item.specification || null,
      quantity: item.quantity || 1,
      unit: item.unit || null,
      target_price: item.referencePrice || null,
      metadata: { ...item, importedAt },
    };

    const { data: existingItem, error: existingItemError } = await supabase
      .from("wpi_inquiry_items")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("legacy_id", legacyId)
      .maybeSingle();
    if (existingItemError) throw existingItemError;

    const itemResult = existingItem
      ? await supabase
          .from("wpi_inquiry_items")
          .update(itemRow)
          .eq("id", existingItem.id)
      : await supabase.from("wpi_inquiry_items").insert(itemRow);
    if (itemResult.error) throw itemResult.error;
    inquiryItemCount += 1;
  }

  for (const response of detail?.suppliers ?? []) {
    const supplier = findSupplier(suppliers, response.supplierName);
    if (!supplier) continue;

    const { error: responseError } = await supabase
      .from("wpi_inquiry_suppliers")
      .upsert(
        {
          organization_id: organizationId,
          inquiry_id: inquiry.id,
          supplier_id: supplier.id,
          response_status: response.responseStatus,
          quoted_amount: response.quoteAmount || null,
          currency: response.currency || null,
          responded_at:
            response.responseStatus === "responded" ? importedAt : null,
          risk_level: normalizeRisk(response.riskLevel),
          ai_recommendation: response.selected
            ? "AI建议纳入比价候选，最终采用需人工确认。"
            : "等待报价或人工复核。",
          metadata: { ...response, importedAt },
        },
        { onConflict: "inquiry_id,supplier_id" },
      );
    if (responseError) throw responseError;
    inquirySupplierCount += 1;
  }

  const { count: linkedSupplierCount, error: linkedSupplierError } =
    await supabase
      .from("wpi_inquiry_suppliers")
      .select("supplier_id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("inquiry_id", inquiry.id);
  if (linkedSupplierError) throw linkedSupplierError;

  if ((linkedSupplierCount ?? 0) === 0) {
    for (const supplier of candidateSuppliers(suppliers, task)) {
      const { error: candidateError } = await supabase
        .from("wpi_inquiry_suppliers")
        .upsert(
          {
            organization_id: organizationId,
            inquiry_id: inquiry.id,
            supplier_id: supplier.id,
            response_status: "draft",
            quoted_amount: null,
            currency: task?.currency ?? null,
            responded_at: null,
            risk_level: "medium",
            ai_recommendation:
              "根据询价对象与供应商经营范围生成候选，发送前必须人工复核主体、联系人和准入状态。",
            metadata: {
              generatedFromCurrentSupplierPool: true,
              reviewRequired: true,
              importedAt,
            },
          },
          { onConflict: "inquiry_id,supplier_id" },
        );
      if (candidateError) throw candidateError;
      inquirySupplierCount += 1;
    }
  }
}

const countTable = async (table) => {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (error) throw error;
  return count;
};

const [equipmentCount, materialCount, inquiryCount] = await Promise.all([
  countTable("wpi_equipment_prices"),
  countTable("wpi_material_prices"),
  countTable("wpi_inquiries"),
]);

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      organizationId,
      source: {
        equipment: equipmentRecords.length,
        materials: materialRecords.length,
        inquiries: inquiryRecords.length,
      },
      database: {
        equipment: equipmentCount,
        materials: materialCount,
        inquiries: inquiryCount,
        inquiryItemsProcessed: inquiryItemCount,
        inquirySuppliersProcessed: inquirySupplierCount,
      },
      priceReviewStatus: "pending_review",
    },
    null,
    2,
  ),
);
