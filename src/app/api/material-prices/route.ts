import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { MaterialPricePayload } from "@/types/materialPriceWorkflow";
import { materialOptionalNumber } from "@/lib/data/materialOptionalNumber";
import { materialListProjection, restoreMaterialListMetadata } from "@/lib/data/materialListProjection";

const writableRoles = new Set(["admin", "manager", "editor"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateValue(value: unknown) {
  const valueText = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : null;
}

function buildPriceCode() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `MAT-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function normalizePayload(raw: MaterialPricePayload) {
  const action = raw.action === "submit_review" ? "submit_review" : "draft";
  return {
    action,
    materialName: cleanText(raw.materialName, 160),
    category: cleanText(raw.category, 80),
    specification: cleanText(raw.specification, 160),
    unit: cleanText(raw.unit, 40),
    price: Math.max(0, numberValue(raw.price)),
    usdPrice: materialOptionalNumber(raw.usdPrice),
    currency: cleanText(raw.currency, 12),
    region: cleanText(raw.region, 100),
    supplierId: cleanText(raw.supplierId, 80) || null,
    supplierName: cleanText(raw.supplierName, 160),
    sourceType: cleanText(raw.sourceType, 80),
    sourceNote: cleanText(raw.sourceNote, 500),
    sourceUrl: cleanText(raw.sourceUrl, 800),
    quoteDate: dateValue(raw.quoteDate),
    validUntil: dateValue(raw.validUntil),
    transportCondition: cleanText(raw.transportCondition, 160),
    confidence: materialOptionalNumber(raw.confidence, 100),
    riskLevel: riskLevels.has(raw.riskLevel) ? raw.riskLevel : "medium",
    aiSuggestion: cleanText(raw.aiSuggestion, 1000),
    notes: cleanText(raw.notes, 1000),
  };
}

export async function GET(request: Request) {
  const access = await getApiAccess();
  const headers = { "Cache-Control": "private, no-store" };
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers });

  const { data, error } = await access.supabase
    .from("wpi_material_prices")
    .select(materialListProjection)
    .eq("organization_id", access.organizationId)
    .order("price_code", { ascending: true })
    .abortSignal(request.signal)
    .overrideTypes<Array<Record<string, unknown>>, { merge: false }>();

  if (error || !Array.isArray(data)) return NextResponse.json({ error: "地材价格读取失败" }, { status: 500, headers });
  return NextResponse.json({ data: data.map(restoreMaterialListMetadata), source: "supabase" }, { headers });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有新增地材价格权限" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "请求内容必须为对象" }, { status: 400 });
  }
  const body = normalizePayload(raw as MaterialPricePayload);
  if (!body.materialName || !body.unit || !body.currency || body.price <= 0) {
    return NextResponse.json({ error: "材料名称、计量单位、币种和有效价格为必填项" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await access.supabase
    .from("wpi_material_prices")
    .insert({
      organization_id: access.organizationId,
      price_code: buildPriceCode(),
      material_name: body.materialName,
      specification: body.specification || null,
      category: body.category || null,
      unit: body.unit,
      price: body.price,
      currency: body.currency,
      region: body.region || null,
      supplier_id: body.supplierId,
      source_type: body.sourceType || null,
      source_url: body.sourceUrl || null,
      valid_until: body.validUntil,
      confidence: body.confidence,
      risk_level: body.riskLevel,
      review_status: body.action === "submit_review" ? "pending_review" : "draft",
      created_by: access.userId,
      updated_by: access.userId,
      metadata: {
        usdPrice: body.usdPrice,
        supplierName: body.supplierName,
        sourceNote: body.sourceNote,
        quoteDate: body.quoteDate,
        transportCondition: body.transportCondition,
        aiSuggestion: body.aiSuggestion,
        notes: body.notes,
        workflowUpdatedAt: now,
      },
    })
    .select("*, wpi_suppliers(id, legacy_id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, source: "supabase" }, { status: 201 });
}
