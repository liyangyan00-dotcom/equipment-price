import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { quoteEventActions } from "@/lib/quote-recognition/audit";

const writeRoles = new Set(["admin", "manager", "editor"]);
const reviewRoles = new Set(["admin", "manager", "reviewer"]);

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const params = request.nextUrl.searchParams;
  const documentId = params.get("id")?.trim();
  const status = params.get("status")?.trim();
  const keyword = params.get("q")?.trim().slice(0, 100);
  const limit = Math.min(50, Math.max(1, Number(params.get("limit")) || 20));

  if (params.get("view") === "progress") {
    if (!documentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    const document = await access.supabase.from("wpi_quote_documents")
      .select("id,status,ai_task_id,error_message,updated_at")
      .eq("organization_id", access.organizationId).eq("id", documentId).maybeSingle();
    if (document.error) return NextResponse.json({ error: document.error.message }, { status: 503 });
    if (!document.data) return NextResponse.json({ error: "报价文件不存在" }, { status: 404 });
    const task = document.data.ai_task_id
      ? await access.supabase.from("wpi_ai_execution_tasks")
        .select("id,task_code,status,stage,progress,confidence,risk_level,error_message")
        .eq("organization_id", access.organizationId).eq("id", document.data.ai_task_id).maybeSingle()
      : { data: null, error: null };
    if (task.error) return NextResponse.json({ error: task.error.message }, { status: 503 });
    return NextResponse.json({ data: { ...document.data, ai_task: task.data } }, { headers: { "Cache-Control": "private, no-store" } });
  }

  let documentQuery = access.supabase
    .from("wpi_quote_documents")
    .select("*")
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (documentId) documentQuery = documentQuery.eq("id", documentId);
  if (status && status !== "all") documentQuery = documentQuery.eq("status", status);
  if (keyword) {
    const safe = keyword.replace(/[,%()]/g, " ").trim();
    if (safe) documentQuery = documentQuery.or(`document_code.ilike.%${safe}%,file_name.ilike.%${safe}%,supplier_name.ilike.%${safe}%`);
  }

  const documentResult = await documentQuery;
  if (documentResult.error) return NextResponse.json({ error: documentResult.error.message }, { status: 500 });
  const documents = documentResult.data ?? [];
  const documentIds = documents.map((item) => String(item.id));
  const taskIds = documents.map((item) => item.ai_task_id).filter(Boolean) as string[];

  const itemCount = () => access.supabase.from("wpi_quote_items").select("id", { count: "exact", head: true }).eq("organization_id", access.organizationId);
  const [itemsResult, evidenceResult, tasksResult, pendingResult, needsInfoResult, highRiskResult, importedResult] = await Promise.all([
    documentIds.length
      ? access.supabase.from("wpi_quote_items").select("*").eq("organization_id", access.organizationId).in("document_id", documentIds).order("line_number")
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? access.supabase.from("wpi_quote_item_evidence").select("*").eq("organization_id", access.organizationId).in("document_id", documentIds).order("page_number")
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? access.supabase.from("wpi_ai_execution_tasks").select("id,task_code,status,stage,progress,confidence,risk_level,output_payload,error_message").eq("organization_id", access.organizationId).in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    itemCount().eq("review_status", "pending_review"),
    itemCount().eq("review_status", "needs_info"),
    itemCount().in("risk_level", ["high", "critical"]),
    itemCount().eq("review_status", "imported"),
  ]);
  const error = itemsResult.error || evidenceResult.error || tasksResult.error || pendingResult.error || needsInfoResult.error || highRiskResult.error || importedResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = itemsResult.data ?? [];
  const evidence = evidenceResult.data ?? [];
  const tasks = new Map((tasksResult.data ?? []).map((task) => [String(task.id), task]));
  const recordIds = [...documentIds, ...items.map((item) => String(item.id))];
  const auditResult = recordIds.length
    ? await access.supabase
      .from("wpi_audit_logs")
      .select("id,actor_id,action,record_id,new_data,created_at")
      .eq("organization_id", access.organizationId)
      .in("record_id", recordIds)
      .in("action", [...quoteEventActions])
      .order("created_at", { ascending: false })
      .limit(300)
    : { data: [], error: null };
  const auditRows = auditResult.error ? [] : auditResult.data ?? [];
  const data = documents.map((document) => ({
    ...document,
    items: items.filter((item) => item.document_id === document.id).map((item) => ({
      ...item,
      evidence: evidence.filter((entry) => entry.item_id === item.id),
    })),
    ai_task: document.ai_task_id ? tasks.get(String(document.ai_task_id)) ?? null : null,
    events: auditRows.flatMap((event) => {
      const payload = event.new_data && typeof event.new_data === "object"
        ? event.new_data as Record<string, unknown>
        : {};
      if (payload.documentId !== document.id) return [];
      return [{
        id: Number(event.id),
        document_id: document.id,
        item_id: typeof payload.itemId === "string" ? payload.itemId : null,
        action: String(event.action),
        note: typeof payload.note === "string" ? payload.note : null,
        metadata: payload.metadata && typeof payload.metadata === "object"
          ? payload.metadata as Record<string, unknown>
          : {},
        actor_id: event.actor_id ? String(event.actor_id) : null,
        created_at: String(event.created_at),
      }];
    }),
  }));

  return NextResponse.json({
    data,
    counts: {
      documents: documents.length,
      pendingItems: pendingResult.count ?? 0,
      needsInfoItems: needsInfoResult.count ?? 0,
      highRiskItems: highRiskResult.count ?? 0,
      importedItems: importedResult.count ?? 0,
    },
    permissions: {
      canWrite: writeRoles.has(access.role),
      canReview: reviewRoles.has(access.role),
    },
    source: "supabase",
  });
}
