import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { MaterialPricePayload, MaterialReviewUpdate } from "@/types/materialPriceWorkflow";
import { materialDate } from "@/lib/data/materialInsights";
import { materialOptionalNumber } from "@/lib/data/materialOptionalNumber";

type RouteContext = { params: Promise<{ id: string }> };

const writableRoles = new Set(["admin", "manager", "editor"]);
const reviewerRoles = new Set(["admin", "manager", "reviewer"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);
const reviewDecisions = new Set(["approve", "need_info", "reject"]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveMaterial(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const query = () => access.supabase
    .from("wpi_material_prices")
    .select("*, wpi_suppliers(id, legacy_id, name)")
    .eq("organization_id", access.organizationId);
  let result = isUuid(id) ? await query().eq("id", id).maybeSingle() : await query().eq("legacy_id", id).maybeSingle();
  if (!result.data && !result.error) result = await query().eq("price_code", id).maybeSingle();
  return result;
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const { data, error } = await resolveMaterial(access, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "地材价格记录不存在" }, { status: 404 });
  return NextResponse.json({ data, source: "supabase" });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "请求内容必须为对象" }, { status: 400 });
  }
  const body = raw as Partial<MaterialPricePayload> & Partial<MaterialReviewUpdate>;
  const isReview = Object.hasOwn(body, "decision");
  if (isReview && !reviewDecisions.has(body.decision ?? "")) {
    return NextResponse.json({ error: "审核决定无效" }, { status: 400 });
  }
  if (!(isReview ? reviewerRoles : writableRoles).has(access.role)) {
    return NextResponse.json({ error: isReview ? "当前角色没有地材价格审核权限" : "当前角色没有编辑地材价格权限" }, { status: 403 });
  }
  if (!isReview && body.action !== undefined && body.action !== "draft" && body.action !== "submit_review") {
    return NextResponse.json({ error: "保存动作无效" }, { status: 400 });
  }
  if (typeof body.expectedUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(body.expectedUpdatedAt)
    || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
    return NextResponse.json({ error: "缺少有效记录版本，请刷新后再提交" }, { status: 428 });
  }
  const { data: current, error: readError } = await resolveMaterial(access, id);
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "地材价格记录不存在" }, { status: 404 });
  if (current.updated_at !== body.expectedUpdatedAt) {
    return NextResponse.json({ error: "记录已被其他操作更新，请刷新并重新核对" }, { status: 409 });
  }
  if (current.review_status === "archived") {
    return NextResponse.json({ error: "已归档记录不可修改" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const metadata = current.metadata && typeof current.metadata === "object" ? current.metadata as Record<string, unknown> : {};
  let patch: Record<string, unknown>;

  if (isReview) {
    if (current.review_status !== "draft" && current.review_status !== "pending_review") {
      return NextResponse.json({ error: "当前记录不在待审核状态" }, { status: 409 });
    }
    if (!text(body.comment, 1000)) {
      return NextResponse.json({ error: "请填写人工核验意见" }, { status: 400 });
    }
    if (body.decision === "approve") {
      const missing = [
        !text(current.material_name) && "材料名称",
        !text(current.specification) && "规格",
        !text(current.unit) && "单位",
        !text(current.currency) && "币种",
        !text(current.region) && "地区",
        !text(current.source_type) && "来源",
        !(current.supplier_id || text(metadata.supplierName)) && "供应商",
        !materialDate(metadata.quoteDate) && "有效报价日期",
        !materialDate(current.valid_until) && "有效期",
        !(Number.isFinite(Number(current.price)) && Number(current.price) > 0) && "有效价格",
      ].filter(Boolean);
      if (missing.length) return NextResponse.json({ error: `暂不能审核通过，请补齐：${missing.join("、")}` }, { status: 400 });
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (String(metadata.quoteDate) > today || current.valid_until < String(metadata.quoteDate)) {
        return NextResponse.json({ error: "报价日期为未来日期或有效期早于报价日期，请先核对" }, { status: 400 });
      }
    }
    const status = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : "pending_review";
    patch = {
      review_status: status,
      updated_by: access.userId,
      metadata: {
        ...metadata,
        reviewDecision: body.decision,
        reviewComment: text(body.comment, 1000),
        reviewedBy: access.userId,
        reviewedAt: now,
        needsInformation: body.decision === "need_info",
      },
    };
  } else {
    const price = Math.max(0, number(body.price, Number(current.price)));
    if (!text(body.materialName ?? current.material_name, 160) || !text(body.unit ?? current.unit, 40) || !text(body.currency ?? current.currency, 12) || price <= 0) {
      return NextResponse.json({ error: "材料名称、计量单位、币种和有效价格为必填项" }, { status: 400 });
    }
    patch = {
      material_name: text(body.materialName ?? current.material_name, 160),
      specification: text(body.specification ?? current.specification, 160) || null,
      category: text(body.category ?? current.category, 80) || null,
      unit: text(body.unit ?? current.unit, 40),
      price,
      currency: text(body.currency ?? current.currency, 12),
      region: text(body.region ?? current.region, 100) || null,
      supplier_id: text(body.supplierId, 80) || current.supplier_id || null,
      source_type: text(body.sourceType ?? current.source_type, 80) || null,
      source_url: text(body.sourceUrl ?? current.source_url, 800) || null,
      valid_until: text(body.validUntil ?? current.valid_until, 10) || null,
      confidence: materialOptionalNumber(body.confidence === undefined ? current.confidence : body.confidence, 100),
      risk_level: riskLevels.has(body.riskLevel ?? "") ? body.riskLevel : current.risk_level,
      review_status: body.action === "submit_review" ? "pending_review" : "draft",
      updated_by: access.userId,
      metadata: {
        ...metadata,
        usdPrice: materialOptionalNumber(body.usdPrice === undefined ? metadata.usdPrice : body.usdPrice),
        supplierName: text(body.supplierName ?? metadata.supplierName, 160),
        sourceNote: text(body.sourceNote ?? metadata.sourceNote, 500),
        quoteDate: text(body.quoteDate ?? metadata.quoteDate, 10),
        transportCondition: text(body.transportCondition ?? metadata.transportCondition, 160),
        aiSuggestion: text(body.aiSuggestion ?? metadata.aiSuggestion, 1000),
        notes: text(body.notes ?? metadata.notes, 1000),
        workflowUpdatedAt: now,
        reviewDecision: null,
        reviewComment: null,
        reviewedBy: null,
        reviewedAt: null,
        needsInformation: false,
      },
    };
  }

  const { data, error } = await access.supabase
    .from("wpi_material_prices")
    .update(patch)
    .eq("organization_id", access.organizationId)
    .eq("id", current.id)
    .eq("updated_at", current.updated_at)
    .eq("review_status", current.review_status)
    .select("*, wpi_suppliers(id, legacy_id, name)")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "记录已更新或当前无写入权限，请刷新核实" }, { status: 409 });
  return NextResponse.json({ data, source: "supabase" });
}
