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
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function loadTypescriptExport(relativePath, exportName) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const commonJsModule = { exports: {} };

  vm.runInNewContext(compiled, {
    module: commonJsModule,
    exports: commonJsModule.exports,
    require() {
      throw new Error(`Unexpected runtime import in ${relativePath}`);
    },
  });

  return commonJsModule.exports[exportName];
}

function normalizeRisk(value) {
  return ["low", "medium", "high", "critical"].includes(value) ? value : "medium";
}

function cleanContactValue(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (
    !normalized ||
    /待补|待核|暂无|未知|未提供|not available|n\/a/i.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function contactName(supplier) {
  return cleanContactValue(supplier.contact) ?? "待补全联系人";
}

function dueDiligenceValue(dueDiligence, field) {
  const item = dueDiligence?.[field];
  return item?.status === "confirmed" ? cleanContactValue(item.value) : null;
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

const importedSuppliers = loadTypescriptExport(
  "src/data/mock/importedKanangaSuppliers.ts",
  "importedKanangaSuppliers",
);
const p0DueDiligence = loadTypescriptExport(
  "src/data/mock/p0SupplierDueDiligence.ts",
  "p0SupplierDueDiligenceById",
);
const p1DueDiligence = loadTypescriptExport(
  "src/data/mock/p1SupplierDueDiligence.ts",
  "p1SupplierDueDiligenceById",
);
const p2DueDiligence = loadTypescriptExport(
  "src/data/mock/p2SupplierDueDiligence.ts",
  "p2SupplierDueDiligenceById",
);
const dueDiligenceById = {
  ...p0DueDiligence,
  ...p1DueDiligence,
  ...p2DueDiligence,
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } =
  await supabase.auth.signInWithPassword({ email, password });
if (authError || !authData.user) {
  throw authError ?? new Error("Temporary administrator sign-in failed.");
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

const now = new Date().toISOString();
const supplierRows = importedSuppliers.map((supplier) => {
  const dueDiligence = dueDiligenceById[supplier.id];

  return {
    organization_id: membership.organization_id,
    legacy_id: supplier.id,
    supplier_code: supplier.supplierCode,
    name: supplier.supplierName,
    legal_name: supplier.englishName || null,
    country_code: supplier.countryCode || null,
    region: supplier.countryRegion || null,
    category: supplier.category || null,
    business_scope: supplier.mainScope || null,
    website: cleanContactValue(supplier.website),
    unified_social_credit_code: dueDiligenceValue(
      dueDiligence,
      "unifiedSocialCreditCode",
    ),
    legal_representative: dueDiligenceValue(
      dueDiligence,
      "legalRepresentative",
    ),
    registered_capital: dueDiligenceValue(dueDiligence, "registeredCapital"),
    confidence: Math.max(
      0,
      Math.min(100, Number(supplier.dataCompleteness ?? supplier.overallScore ?? 0)),
    ),
    risk_level: normalizeRisk(supplier.riskLevel ?? supplier.deliveryRisk),
    review_status: "pending_review",
    source_url: cleanContactValue(supplier.website),
    source_checked_at: now,
    metadata: {
      ...supplier,
      dueDiligence: dueDiligence ?? null,
      migration: {
        importedAt: now,
        source: "existing_supplier_mock_and_excel_research",
        reviewRequired: true,
        inquiryAdmission: false,
      },
    },
    created_by: authData.user.id,
    updated_by: authData.user.id,
  };
});

const { data: upsertedSuppliers, error: supplierError } = await supabase
  .from("wpi_suppliers")
  .upsert(supplierRows, { onConflict: "organization_id,supplier_code" })
  .select("id, legacy_id, supplier_code");
if (supplierError) throw supplierError;

let contactCount = 0;
for (const supplier of importedSuppliers) {
  const databaseSupplier = upsertedSuppliers.find(
    (item) => item.supplier_code === supplier.supplierCode,
  );
  if (!databaseSupplier) continue;

  const phone = cleanContactValue(supplier.phone);
  const whatsapp = cleanContactValue(supplier.whatsapp);
  const contactEmail = cleanContactValue(supplier.email);
  const name = contactName(supplier);

  if (!phone && !whatsapp && !contactEmail && name === "待补全联系人") continue;

  const { data: existingContact, error: existingContactError } = await supabase
    .from("wpi_supplier_contacts")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("supplier_id", databaseSupplier.id)
    .eq("is_primary", true)
    .maybeSingle();
  if (existingContactError) throw existingContactError;

  const contactRow = {
    organization_id: membership.organization_id,
    supplier_id: databaseSupplier.id,
    name,
    title: "主要联系人",
    phone,
    whatsapp,
    email: contactEmail,
    is_primary: true,
    verified_at: null,
    created_by: authData.user.id,
  };

  const contactResult = existingContact
    ? await supabase
        .from("wpi_supplier_contacts")
        .update(contactRow)
        .eq("id", existingContact.id)
    : await supabase.from("wpi_supplier_contacts").insert(contactRow);
  if (contactResult.error) throw contactResult.error;
  contactCount += 1;
}

const { count: supplierCount, error: countError } = await supabase
  .from("wpi_suppliers")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", membership.organization_id);
if (countError) throw countError;

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      organizationId: membership.organization_id,
      role: membership.role,
      sourceSuppliers: importedSuppliers.length,
      upsertedSuppliers: upsertedSuppliers.length,
      primaryContactsProcessed: contactCount,
      databaseSupplierCount: supplierCount,
      reviewStatus: "pending_review",
    },
    null,
    2,
  ),
);
