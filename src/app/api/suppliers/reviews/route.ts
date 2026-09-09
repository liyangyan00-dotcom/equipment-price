import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const decisions = new Set(["pending_review", "approved", "rejected"]);

function clean(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const decision = clean(body.decision, 40);
  const notes = clean(body.notes);
  const identifiers = Array.isArray(body.supplierIds)
    ? [...new Set(body.supplierIds.map((value) => clean(value, 100)).filter(Boolean))].slice(0, 100)
    : [];
  if (!decisions.has(decision)) return NextResponse.json({ error: "供应商审核结论无效" }, { status: 400 });
  if (!identifiers.length) return NextResponse.json({ error: "请选择供应商" }, { status: 400 });
  if (notes.length < 5) return NextResponse.json({ error: "请填写至少 5 个字符的人工审核说明" }, { status: 400 });

  const suppliers = await access.supabase
    .from("wpi_suppliers")
    .select("id,legacy_id,name,legal_name,review_status")
    .eq("organization_id", access.organizationId);
  if (suppliers.error) return NextResponse.json({ error: suppliers.error.message }, { status: 500 });
  const requested = new Set(identifiers);
  const matched = (suppliers.data ?? []).filter((supplier) => requested.has(supplier.id) || requested.has(supplier.legacy_id ?? ""));
  if (matched.length !== identifiers.length) {
    return NextResponse.json({ error: "部分供应商不存在或不属于当前组织" }, { status: 404 });
  }

  const result = await access.supabase.rpc("wpi_review_suppliers", {
    p_supplier_ids: matched.map((supplier) => supplier.id),
    p_decision: decision,
    p_notes: notes,
  });
  if (result.error) {
    const message = result.error.message.includes("SUPPLIER_REVIEW_FORBIDDEN")
      ? "当前角色没有供应商审核权限"
      : result.error.message.includes("SUPPLIER_LEGAL_ENTITY_REQUIRED")
        ? "存在未识别法律主体的供应商，不能审核通过"
        : result.error.message;
    return NextResponse.json({ error: message }, { status: message.includes("权限") ? 403 : 409 });
  }
  return NextResponse.json({ data: result.data ?? [], source: "supabase" });
}
