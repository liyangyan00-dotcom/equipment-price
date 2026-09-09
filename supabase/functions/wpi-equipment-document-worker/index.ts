import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Json = Record<string, unknown>;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function text(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalized(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function stableCode(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

async function resolveReadableDocumentSource(
  admin: ReturnType<typeof createClient>,
  url: string,
  mimeType: string,
) {
  let readableUrl = url;
  if (url.startsWith("storage://")) {
    const storageLocation = url.slice("storage://".length);
    const separator = storageLocation.indexOf("/");
    if (separator <= 0) throw new Error("DOCUMENT_STORAGE_LOCATION_INVALID");
    const bucket = storageLocation.slice(0, separator);
    const path = storageLocation.slice(separator + 1);
    const signed = await admin.storage.from(bucket).createSignedUrl(path, 3600);
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(`DOCUMENT_STORAGE_SIGN_FAILED:${signed.error?.message || "UNKNOWN"}`);
    }
    readableUrl = signed.data.signedUrl;
  }
  if (mimeType !== "application/pdf") return readableUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(readableUrl, {
      headers: { Range: "bytes=0-7", Accept: "application/pdf" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`DOCUMENT_SOURCE_HTTP_${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") {
      throw new Error("DOCUMENT_SOURCE_NOT_PDF_OR_REQUIRES_AUTH");
    }
    return readableUrl;
  } finally {
    clearTimeout(timeout);
  }
}

function parseParameters(payload: unknown) {
  const root = object(payload);
  const data = object(root.data);
  const document = object(data.document);
  const rawParameters = Array.isArray(data.parameters) ? data.parameters : [];
  if (!rawParameters.length) throw new Error("视觉模型未返回可审核的设备参数");
  const parameters = rawParameters.slice(0, 300).map((candidate, index) => {
    const parameter = object(candidate);
    const source = object(parameter.source);
    const bbox = object(source.bbox);
    const name = text(parameter.name, 180);
    const value = text(parameter.value, 1000);
    if (!name || !value) throw new Error(`第 ${index + 1} 个参数缺少名称或值`);
    const x = Math.max(0, Math.min(1, number(bbox.x)));
    const y = Math.max(0, Math.min(1, number(bbox.y)));
    const confidence = Math.max(0, Math.min(100, number(parameter.confidence)));
    const riskLevel = ["low", "medium", "high", "critical"].includes(String(parameter.riskLevel))
      ? String(parameter.riskLevel)
      : "medium";
    return {
      code: text(parameter.code, 100) || `PDF_${stableCode(name)}`,
      name,
      group: text(parameter.group, 80) || "other",
      normalizedValue: text(parameter.normalizedValue, 1000) || value,
      unit: text(parameter.unit, 40),
      confidence,
      riskLevel,
      evidence: {
        pageNumber: Math.max(1, Math.round(number(source.pageNumber, 1))),
        text: text(source.text, 4000),
        bbox: {
          x,
          y,
          width: Math.max(0.001, Math.min(1 - x, number(bbox.width, 1 - x))),
          height: Math.max(0.001, Math.min(1 - y, number(bbox.height, 0.05))),
          precision: text(bbox.precision, 30) || "region",
        },
      },
    };
  });
  return {
    parameters,
    pageCount: Math.max(1, Math.round(number(document.pageCount, 1))),
    confidence: Math.max(0, Math.min(100, number(data.overallConfidence))),
    riskLevel: text(data.riskLevel, 20) || "medium",
    warnings: Array.isArray(data.warnings) ? data.warnings.map((item) => text(item, 300)).filter(Boolean).slice(0, 50) : [],
    provider: text(root.provider, 100),
    model: text(root.model, 100),
    gatewayRunId: text(root.gatewayRunId, 100) || null,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !publishableKey || !secretKey || !token) return json({ error: "文档Worker配置不完整" }, 500);
    const body = await request.json().catch(() => ({})) as {
      organizationId?: string;
      jobId?: string;
      taskId?: string;
      limit?: number;
    };
    const organizationId = text(body.organizationId);
    if (!organizationId) return json({ error: "缺少组织ID" }, 400);

    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const internalRequest = token === secretKey;
    if (!internalRequest) {
      const userClient = createClient(supabaseUrl, publishableKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const auth = await userClient.auth.getUser(token);
      if (auth.error || !auth.data.user) return json({ error: "登录状态已失效" }, 401);
      const membership = await admin.from("wpi_organization_members").select("role,is_active")
        .eq("organization_id", organizationId).eq("user_id", auth.data.user.id).eq("is_active", true).maybeSingle();
      if (!membership.data || !["admin", "manager", "editor", "reviewer"].includes(String(membership.data.role))) {
        return json({ error: "当前账号没有设备文档解析权限" }, 403);
      }
    }

    const limit = Math.max(1, Math.min(5, Math.round(number(body.limit, 2))));
    let query = admin.from("wpi_equipment_catalog_document_jobs").select("*")
      .eq("organization_id", organizationId).eq("status", "queued")
      .order("created_at", { ascending: true }).limit(limit);
    if (text(body.jobId)) query = query.eq("id", text(body.jobId));
    if (text(body.taskId)) query = query.contains("metadata", { collectionTaskId: text(body.taskId) });
    const jobs = await query;
    if (jobs.error) throw jobs.error;

    const results: Array<{ jobId: string; status: string; parameterCount?: number; pendingCount?: number; error?: string }> = [];
    for (const job of jobs.data ?? []) {
      const claimed = await admin.from("wpi_equipment_catalog_document_jobs").update({
        status: "running", progress: 10, started_at: new Date().toISOString(), error_message: null,
      }).eq("id", job.id).eq("status", "queued").select("id").maybeSingle();
      if (claimed.error) throw claimed.error;
      if (!claimed.data) continue;
      try {
        const readableDocumentUrl = await resolveReadableDocumentSource(
          admin,
          String(job.document_url),
          String(job.mime_type),
        );
        const catalog = await admin.from("wpi_equipment_catalog")
          .select("id,equipment_name,brand,model")
          .eq("organization_id", organizationId).eq("id", job.equipment_catalog_id).single();
        if (catalog.error) throw catalog.error;
        const gatewayResponse = await fetch(`${supabaseUrl}/functions/v1/wpi-ai-gateway`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
          body: JSON.stringify({
            action: "recognize_equipment_document",
            organizationId,
            businessObjectId: job.equipment_catalog_id,
            fileName: job.file_name,
            mimeType: job.mime_type,
            sourceUrl: readableDocumentUrl,
            requestedBy: job.requested_by,
          }),
        });
        const gatewayPayload = await gatewayResponse.json().catch(() => ({}));
        if (!gatewayResponse.ok || gatewayPayload.error) throw new Error(text(gatewayPayload.error) || `AI网关返回HTTP ${gatewayResponse.status}`);
        const parsed = parseParameters(gatewayPayload);
        const existing = await admin.from("wpi_equipment_catalog_parameters")
          .select("parameter_code,parameter_name,raw_value,normalized_value,unit")
          .eq("equipment_catalog_id", job.equipment_catalog_id);
        if (existing.error) throw existing.error;
        const byCode = new Map((existing.data ?? []).map((item) => [String(item.parameter_code), item]));
        const byName = new Map((existing.data ?? []).map((item) => [normalized(item.parameter_name), item]));
        const rows = parsed.parameters.map((parameter) => {
          const current = byCode.get(parameter.code) || byName.get(normalized(parameter.name));
          const currentValue = String(current?.normalized_value || current?.raw_value || "");
          const same = normalized(currentValue) === normalized(parameter.normalizedValue)
            && normalized(current?.unit) === normalized(parameter.unit);
          return {
            organization_id: organizationId,
            job_id: job.id,
            equipment_catalog_id: job.equipment_catalog_id,
            parameter_code: parameter.code,
            parameter_name: parameter.name,
            parameter_group: parameter.group,
            current_value: currentValue || null,
            current_unit: current?.unit || null,
            proposed_value: parameter.normalizedValue,
            proposed_unit: parameter.unit || null,
            difference_type: current ? same ? "same" : "changed" : "new",
            source_page: parameter.evidence.pageNumber,
            bounding_box: parameter.evidence.bbox,
            source_text: parameter.evidence.text,
            source_url: job.document_url,
            confidence: parameter.confidence,
            risk_level: parameter.riskLevel,
            review_decision: same ? "accepted" : "pending",
            review_note: same ? "与当前正式参数一致，系统自动标记已核对" : "",
            reviewed_by: same ? job.requested_by : null,
            reviewed_at: same ? new Date().toISOString() : null,
            metadata: { autoParsed: true, requiresHumanReview: !same },
          };
        }).filter((item, index, all) => all.findIndex((candidate) => candidate.parameter_code === item.parameter_code) === index);
        const candidates = await admin.from("wpi_equipment_catalog_parameter_candidates")
          .upsert(rows, { onConflict: "job_id,parameter_code" });
        if (candidates.error) throw candidates.error;
        const pendingCount = rows.filter((item) => item.review_decision === "pending").length;
        const completedAt = new Date().toISOString();
        const jobUpdate = await admin.from("wpi_equipment_catalog_document_jobs").update({
          status: pendingCount ? "needs_review" : "completed",
          progress: 100,
          page_count: parsed.pageCount,
          parameter_count: rows.length,
          provider: parsed.provider || null,
          model: parsed.model || null,
          gateway_run_id: parsed.gatewayRunId,
          completed_at: completedAt,
          metadata: {
            ...object(job.metadata),
            autoParsed: true,
            requiresHumanReview: pendingCount > 0,
            pendingCount,
            overallConfidence: parsed.confidence,
            riskLevel: parsed.riskLevel,
            warnings: parsed.warnings,
          },
        }).eq("id", job.id);
        if (jobUpdate.error) throw jobUpdate.error;
        await admin.from("wpi_equipment_catalog").update({
          review_status: "pending_review", updated_by: job.requested_by, updated_at: completedAt,
        }).eq("organization_id", organizationId).eq("id", job.equipment_catalog_id);
        results.push({ jobId: job.id, status: pendingCount ? "needs_review" : "completed", parameterCount: rows.length, pendingCount });
      } catch (error) {
        const message = error instanceof Error ? error.message : "PDF设备资料解析失败";
        await admin.from("wpi_equipment_catalog_document_jobs").update({
          status: "failed", progress: 100, error_message: message.slice(0, 4000), completed_at: new Date().toISOString(),
          metadata: {
            ...object(job.metadata),
            sourcePreflightFailed: message.startsWith("DOCUMENT_SOURCE_"),
            sourcePreflightError: message.startsWith("DOCUMENT_SOURCE_") ? message : null,
          },
        }).eq("id", job.id);
        results.push({ jobId: job.id, status: "failed", error: message });
      }
    }
    const remaining = await admin.from("wpi_equipment_catalog_document_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "queued");
    if ((remaining.count ?? 0) > 0 && results.length > 0) {
      const continuation = fetch(`${supabaseUrl}/functions/v1/wpi-equipment-document-worker`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
        body: JSON.stringify({ organizationId, taskId: text(body.taskId) || undefined, limit }),
      });
      const runtime = (globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
      }).EdgeRuntime;
      if (runtime) runtime.waitUntil(continuation);
      else void continuation;
    }
    return json({ data: { processed: results.length, remaining: remaining.count ?? 0, results } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "文档解析Worker执行失败" }, 500);
  }
});
