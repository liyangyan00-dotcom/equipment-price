import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json" };
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") ?? "";
  const cronSecret = request.headers.get("x-wpi-cron-secret") ?? "";
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const token = authorization.replace(/^Bearer\s+/i, "");
  let systemMode = token === serviceKey;
  if (!systemMode && cronSecret) {
    const verified = await admin.rpc("wpi_verify_inquiry_reminder_cron_secret", {
      candidate_secret: cronSecret,
    });
    systemMode = !verified.error && verified.data === true;
  }
  let organizationId = "";
  let actorId: string | null = null;
  if (!systemMode) {
    const user = await admin.auth.getUser(token);
    if (user.error || !user.data.user) return json({ error: "UNAUTHORIZED" }, 401);
    const membership = await admin.from("wpi_organization_members").select("organization_id,role")
      .eq("user_id", user.data.user.id).eq("is_active", true).limit(1).maybeSingle();
    if (membership.error || !membership.data || !["admin", "manager", "reviewer"].includes(membership.data.role))
      return json({ error: "REMINDER_RUN_FORBIDDEN" }, 403);
    organizationId = membership.data.organization_id;
    actorId = user.data.user.id;
  }

  let policyQuery = admin.from("wpi_inquiry_reminder_policies")
    .select("*,wpi_inquiries(id,inquiry_code,subject,deadline,status)")
    .eq("enabled", true).lte("next_run_at", new Date().toISOString()).order("next_run_at").limit(100);
  if (organizationId) policyQuery = policyQuery.eq("organization_id", organizationId);
  const policies = await policyQuery;
  if (policies.error) return json({ error: policies.error.message }, 500);

  const results: Array<Record<string, unknown>> = [];
  for (const policy of policies.data ?? []) {
    const inquiry = Array.isArray(policy.wpi_inquiries) ? policy.wpi_inquiries[0] : policy.wpi_inquiries;
    if (!inquiry || !["pending_review", "approved"].includes(inquiry.status) || policy.reminder_count >= policy.max_reminders) {
      await admin.from("wpi_inquiry_reminder_policies").update({ enabled: false, last_error: null }).eq("id", policy.id);
      results.push({ policyId: policy.id, skipped: true, reason: "closed_or_limit" });
      continue;
    }
    const pending = await admin.from("wpi_inquiry_suppliers").select("supplier_id")
      .eq("organization_id", policy.organization_id).eq("inquiry_id", policy.inquiry_id)
      .not("delivery_status", "in", "(replied)").is("responded_at", null);
    if (pending.error) {
      await admin.from("wpi_inquiry_reminder_policies").update({ last_error: pending.error.message }).eq("id", policy.id);
      results.push({ policyId: policy.id, ok: false, error: pending.error.message });
      continue;
    }
    const supplierIds = (pending.data ?? []).map((item) => item.supplier_id);
    if (!supplierIds.length) {
      await admin.from("wpi_inquiry_reminder_policies").update({ enabled: false, last_run_at: new Date().toISOString(), last_error: null }).eq("id", policy.id);
      results.push({ policyId: policy.id, skipped: true, reason: "all_replied" });
      continue;
    }
    const mail = await fetch(`${url}/functions/v1/wpi-inquiry-mailer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId: policy.inquiry_id, supplierIds, mode: "reminder", organizationId: policy.organization_id, actorId: policy.created_by }),
    });
    const mailPayload = await mail.json().catch(() => ({})) as { succeeded?: number; failed?: number; error?: string };
    const now = new Date();
    const succeeded = Number(mailPayload.succeeded ?? 0);
    if (!mail.ok || succeeded < 1) {
      const retryDelayHours = Math.min(6, Math.max(1, Number(policy.interval_hours)));
      await admin.from("wpi_inquiry_reminder_policies").update({
        last_run_at: now.toISOString(),
        next_run_at: new Date(now.getTime() + retryDelayHours * 3600000).toISOString(),
        last_error: mailPayload.error || `MAILER_HTTP_${mail.status}`,
        enabled: true,
        updated_by: actorId || policy.created_by,
      }).eq("id", policy.id);
      results.push({
        policyId: policy.id,
        ok: false,
        supplierCount: supplierIds.length,
        reminderCount: Number(policy.reminder_count),
        retryAt: new Date(now.getTime() + retryDelayHours * 3600000).toISOString(),
        ...mailPayload,
      });
      continue;
    }
    const reminderCount = Number(policy.reminder_count) + 1;
    const deadline = inquiry.deadline ? new Date(inquiry.deadline) : null;
    const shouldEscalate = Boolean(deadline && now.getTime() > deadline.getTime() + Number(policy.escalate_after_deadline_hours) * 3600000);
    await admin.from("wpi_inquiry_reminder_policies").update({
      reminder_count: reminderCount,
      last_run_at: now.toISOString(),
      next_run_at: new Date(now.getTime() + Number(policy.interval_hours) * 3600000).toISOString(),
      last_error: null,
      enabled: reminderCount < Number(policy.max_reminders),
      updated_by: actorId || policy.created_by,
    }).eq("id", policy.id);
    if (shouldEscalate) {
      await admin.from("wpi_inquiry_events").insert({
        organization_id: policy.organization_id,
        inquiry_id: policy.inquiry_id,
        event_type: "reminder_escalated",
        event_status: "needs_review",
        actor_id: actorId,
        payload: { ownerId: policy.escalation_owner_id, pendingSupplierIds: supplierIds, reminderCount },
      });
    }
    results.push({ policyId: policy.id, ok: mail.ok, supplierCount: supplierIds.length, escalated: shouldEscalate, ...mailPayload });
  }
  return json({ data: results, processed: results.length });
});
