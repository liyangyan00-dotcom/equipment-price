import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const allowedRoles = new Set(["admin", "manager", "editor", "reviewer"]);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}

function credentialParts(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return { apiKey: "", webhookSecret: "" };
  try {
    const parsed = JSON.parse(raw) as {
      apiKey?: string;
      webhookSecret?: string;
    };
    return {
      apiKey: parsed.apiKey?.trim() ?? "",
      webhookSecret: parsed.webhookSecret?.trim() ?? "",
    };
  } catch {
    return { apiKey: raw, webhookSecret: "" };
  }
}

function createPortalToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function resendEmailsEndpoint(value: unknown) {
  const endpoint = String(value ?? "").trim().replace(/\/$/, "");
  if (!endpoint || endpoint === "https://api.resend.com") {
    return "https://api.resend.com/emails";
  }
  return endpoint;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function verifyResendSenderDomain(apiKey: string, senderAddress: string) {
  const senderDomain = senderAddress.split("@").at(-1)?.toLowerCase() ?? "";
  if (!senderDomain) return { ok: false, error: "EMAIL_SENDER_NOT_CONFIGURED" };
  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = await response.json().catch(() => ({})) as {
    name?: string;
    data?: Array<{ name?: string; status?: string }>;
  };
  if (response.status === 401 && payload.name === "restricted_api_key") {
    return { ok: false, error: "EMAIL_SENDER_DOMAIN_UNVERIFIABLE" };
  }
  if (!response.ok) {
    return { ok: false, error: `EMAIL_PROVIDER_HTTP_${response.status}`, detail: payload };
  }
  const domain = payload.data?.find((item) => item.name?.toLowerCase() === senderDomain);
  if (!domain || domain.status?.toLowerCase() !== "verified") {
    return { ok: false, error: "EMAIL_SENDER_DOMAIN_NOT_VERIFIED", detail: { senderDomain, status: domain?.status ?? "missing" } };
  }
  return { ok: true, senderDomain };
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") ?? "";
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const userResult = await admin.auth.getUser(token);

  const body = (await request.json().catch(() => null)) as {
    action?: "validate";
    inquiryId?: string;
    supplierIds?: string[];
    retry?: boolean;
    mode?: "send" | "reminder";
    organizationId?: string;
    actorId?: string | null;
  } | null;
  if (!body) return json({ error: "REQUEST_BODY_REQUIRED" }, 400);
  const systemMode = token === serviceKey && Boolean(body.organizationId);
  let organizationId = body.organizationId ?? "";
  let actorId = body.actorId ?? null;
  if (!systemMode) {
    if (userResult.error || !userResult.data.user)
      return json({ error: "UNAUTHORIZED" }, 401);
    const membership = await admin
      .from("wpi_organization_members")
      .select("organization_id,role")
      .eq("user_id", userResult.data.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (membership.error || !membership.data)
      return json({ error: "NO_ACTIVE_ORGANIZATION" }, 403);
    if (!allowedRoles.has(membership.data.role))
      return json({ error: "INQUIRY_WRITE_FORBIDDEN" }, 403);
    organizationId = membership.data.organization_id;
    actorId = userResult.data.user.id;
  }

  if (body.action === "validate") {
    const runtime = await admin.rpc("wpi_get_runtime_integration", {
      target_organization_id: organizationId,
      target_integration_code: "SMTP_OUTBOUND",
    });
    const integration = runtime.data as {
      provider?: string;
      status?: string;
      config?: Record<string, unknown>;
      credential?: string;
    } | null;
    const credential = credentialParts(integration?.credential);
    const senderAddress = String(integration?.config?.senderAddress ?? "").trim();
    const publicAppUrl = String(integration?.config?.publicAppUrl ?? "").trim();
    const replyToAddress = String(integration?.config?.replyToAddress ?? "").trim();
    const webhookUrl = String(integration?.config?.webhookUrl ?? "").trim();
    if (!integration || integration.status === "disabled") return json({ error: "EMAIL_INTEGRATION_DISABLED" }, 409);
    if (!String(integration.provider ?? "").toLowerCase().includes("resend")) return json({ error: "EMAIL_PROVIDER_UNSUPPORTED" }, 409);
    if (!credential.apiKey || !credential.webhookSecret) return json({ error: "EMAIL_CREDENTIAL_INCOMPLETE" }, 409);
    if (!senderAddress || !replyToAddress || !publicAppUrl.startsWith("https://") || !webhookUrl.startsWith("https://")) return json({ error: "EMAIL_BUSINESS_CONFIG_INCOMPLETE" }, 409);
    try {
      const portalHealthResponse = await fetch(
        `${publicAppUrl.replace(/\/$/, "")}/api/public/quote-response/health`,
        {
          headers: { Accept: "application/json" },
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        },
      );
      const portalHealth = await portalHealthResponse.json().catch(() => null) as {
        service?: string;
        public?: boolean;
      } | null;
      if (
        !portalHealthResponse.ok ||
        portalHealth?.service !== "wpi-supplier-quote-portal" ||
        portalHealth.public !== true
      ) {
        return json({ error: "EMAIL_PUBLIC_PORTAL_UNREACHABLE" }, 409);
      }
    } catch {
      return json({ error: "EMAIL_PUBLIC_PORTAL_UNREACHABLE" }, 409);
    }
    const domainCheck = await verifyResendSenderDomain(credential.apiKey, senderAddress);
    if (!domainCheck.ok) return json(domainCheck, 409);
    return json({ ok: true, provider: "Resend", senderAddress, replyToAddress, publicAppUrl, senderDomain: domainCheck.senderDomain });
  }

  if (!body.inquiryId) return json({ error: "INQUIRY_ID_REQUIRED" }, 400);

  const inquiry = await admin
    .from("wpi_inquiries")
    .select("id,inquiry_code,subject,status,deadline,letter_content,metadata")
    .eq("organization_id", organizationId)
    .eq("id", body.inquiryId)
    .maybeSingle();
  if (inquiry.error || !inquiry.data)
    return json({ error: "INQUIRY_NOT_FOUND" }, 404);
  if (!inquiry.data.letter_content?.trim())
    return json({ error: "INQUIRY_LETTER_EMPTY" }, 409);
  if (!["pending_review", "approved"].includes(inquiry.data.status))
    return json({ error: "INQUIRY_NOT_APPROVED_FOR_SEND" }, 409);
  const inquiryMetadata = inquiry.data.metadata && typeof inquiry.data.metadata === "object"
    ? inquiry.data.metadata as Record<string, unknown>
    : {};
  if (
    inquiryMetadata.aiApprovalStatus !== "approved" ||
    inquiryMetadata.aiApprovalInvalidated === true
  ) {
    return json({ error: "INQUIRY_AI_DRAFT_NOT_APPROVED" }, 409);
  }
  if (!inquiryMetadata.sendPreflightPassedAt)
    return json({ error: "INQUIRY_SEND_PREFLIGHT_REQUIRED" }, 409);
  const supplierMapping = Array.isArray(inquiryMetadata.supplierMapping)
    ? inquiryMetadata.supplierMapping as Array<Record<string, unknown>>
    : [];
  if (
    !supplierMapping.length ||
    supplierMapping.some((mapping) =>
      mapping.status !== "complete" ||
      !Array.isArray(mapping.supplierIds) ||
      mapping.supplierIds.length === 0
    )
  ) {
    return json({ error: "INQUIRY_SUPPLIER_MAPPING_INCOMPLETE" }, 409);
  }
  if (body.mode !== "reminder") {
    const deadline = inquiry.data.deadline ? new Date(inquiry.data.deadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now())
      return json({ error: "INQUIRY_DEADLINE_INVALID" }, 409);
  }

  const runtime = await admin.rpc("wpi_get_runtime_integration", {
    target_organization_id: organizationId,
    target_integration_code: "SMTP_OUTBOUND",
  });
  if (runtime.error || !runtime.data)
    return json({ error: "EMAIL_INTEGRATION_NOT_CONFIGURED" }, 409);
  const integration = runtime.data as {
    provider?: string;
    endpointUrl?: string;
    status?: string;
    config?: Record<string, unknown>;
    credential?: string;
  };
  if (integration.status !== "active")
    return json({ error: "EMAIL_INTEGRATION_NOT_ACTIVE" }, 409);
  if (
    !String(integration.provider ?? "")
      .toLowerCase()
      .includes("resend")
  )
    return json(
      {
        error: "EMAIL_PROVIDER_UNSUPPORTED",
        detail: "当前真实发送网关支持 Resend HTTP API。",
      },
      409,
    );
  const credential = credentialParts(integration.credential);
  if (!credential.apiKey)
    return json({ error: "EMAIL_CREDENTIAL_MISSING" }, 409);
  const senderAddress = String(integration.config?.senderAddress ?? "").trim();
  const senderName = String(
    integration.config?.senderName ?? "水厂价格情报系统",
  ).trim();
  const replyToAddress = String(integration.config?.replyToAddress ?? "").trim();
  const publicAppUrl = String(integration.config?.publicAppUrl ?? "").trim().replace(/\/$/, "");
  if (!senderAddress || senderAddress.endsWith("@example.com"))
    return json({ error: "EMAIL_SENDER_NOT_CONFIGURED" }, 409);
  const domainCheck = await verifyResendSenderDomain(credential.apiKey, senderAddress);
  if (!domainCheck.ok) return json(domainCheck, 409);

  let suppliersQuery = admin
    .from("wpi_inquiry_suppliers")
    .select(
      "supplier_id,delivery_status,send_attempts,wpi_suppliers(name,review_status,wpi_supplier_contacts(name,email,is_primary,verified_at))",
    )
    .eq("organization_id", organizationId)
    .eq("inquiry_id", inquiry.data.id);
  if (body.supplierIds?.length)
    suppliersQuery = suppliersQuery.in("supplier_id", [
      ...new Set(body.supplierIds),
    ]);
  const suppliers = await suppliersQuery;
  if (suppliers.error) return json({ error: suppliers.error.message }, 500);

  const results: Array<Record<string, unknown>> = [];
  for (const link of suppliers.data ?? []) {
    const supplier = Array.isArray(link.wpi_suppliers)
      ? link.wpi_suppliers[0]
      : link.wpi_suppliers;
    const contacts = Array.isArray(supplier?.wpi_supplier_contacts)
      ? supplier.wpi_supplier_contacts
      : [];
    if (supplier?.review_status !== "approved") {
      const error = "供应商尚未通过准入复核";
      await admin
        .from("wpi_inquiry_events")
        .insert({
          organization_id: organizationId,
          inquiry_id: inquiry.data.id,
          supplier_id: link.supplier_id,
          event_type: "send_blocked",
          event_status: "failed",
          actor_id: actorId,
          provider: integration.provider,
          error_message: error,
        });
      results.push({ supplierId: link.supplier_id, ok: false, error });
      continue;
    }
    const contact =
      contacts.find((item) => item.is_primary && item.email) ??
      contacts.find((item) => item.email);
    if (!contact?.email) {
      const error = "供应商缺少可用邮箱";
      await admin
        .from("wpi_inquiry_suppliers")
        .update({
          delivery_status: "failed",
          last_error: error,
          send_attempts: Number(link.send_attempts ?? 0) + 1,
        })
        .eq("inquiry_id", inquiry.data.id)
        .eq("supplier_id", link.supplier_id);
      await admin
        .from("wpi_inquiry_events")
        .insert({
          organization_id: organizationId,
          inquiry_id: inquiry.data.id,
          supplier_id: link.supplier_id,
          event_type: "send_failed",
          event_status: "failed",
          actor_id: actorId,
          provider: integration.provider,
          error_message: error,
        });
      results.push({ supplierId: link.supplier_id, ok: false, error });
      continue;
    }
    await admin
      .from("wpi_inquiry_suppliers")
      .update({ delivery_status: "queued", last_error: null })
      .eq("inquiry_id", inquiry.data.id)
      .eq("supplier_id", link.supplier_id);
    const isReminder = body.mode === "reminder";
    const portalToken = createPortalToken();
    const tokenHash = await sha256(portalToken);
    await admin
      .from("wpi_inquiry_portal_tokens")
      .update({ status: "revoked" })
      .eq("inquiry_id", inquiry.data.id)
      .eq("supplier_id", link.supplier_id)
      .eq("status", "active");
    const portalInsert = await admin.from("wpi_inquiry_portal_tokens").insert({
      organization_id: organizationId,
      inquiry_id: inquiry.data.id,
      supplier_id: link.supplier_id,
      token_hash: tokenHash,
      expires_at: inquiry.data.deadline
        ? new Date(new Date(inquiry.data.deadline).getTime() + 7 * 86400000).toISOString()
        : new Date(Date.now() + 30 * 86400000).toISOString(),
      created_by: actorId,
    });
    if (portalInsert.error) {
      results.push({ supplierId: link.supplier_id, ok: false, error: portalInsert.error.message });
      continue;
    }
    const responseUrl = publicAppUrl ? `${publicAppUrl}/quote-response/${portalToken}` : "";
    const letterText = inquiry.data.letter_content.replaceAll(
      "{{供应商名称}}",
      supplier?.name ?? "供应商",
    );
    const actionText = responseUrl
      ? `\n\n在线逐项报价入口：${responseUrl}\n请在该入口填写单价、交期、技术偏差和商务偏差。`
      : "";
    const response = await fetch(
      resendEmailsEndpoint(integration.endpointUrl),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderName} <${senderAddress}>`,
          to: [contact.email],
          ...(replyToAddress ? { reply_to: replyToAddress } : {}),
          subject: isReminder
            ? `报价催办：[${inquiry.data.inquiry_code}] ${inquiry.data.subject}`
            : `[${inquiry.data.inquiry_code}] ${inquiry.data.subject}`,
          text: isReminder
            ? `您好，关于以下询价任务尚未收到完整报价，请在截止时间前回复。如已提交，请忽略本提醒。\n\n${letterText}${actionText}`
            : `${letterText}${actionText}`,
          tags: [
            { name: "inquiry_id", value: inquiry.data.id },
            { name: "supplier_id", value: link.supplier_id },
          ],
        }),
      },
    );
    const responsePayload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    const now = new Date().toISOString();
    if (!response.ok || !responsePayload.id) {
      const error =
        responsePayload.message ||
        responsePayload.name ||
        `EMAIL_PROVIDER_HTTP_${response.status}`;
      await admin
        .from("wpi_inquiry_suppliers")
        .update({
          delivery_status: "failed",
          last_error: error,
          send_attempts: Number(link.send_attempts ?? 0) + 1,
        })
        .eq("inquiry_id", inquiry.data.id)
        .eq("supplier_id", link.supplier_id);
      await admin
        .from("wpi_inquiry_events")
        .insert({
          organization_id: organizationId,
          inquiry_id: inquiry.data.id,
          supplier_id: link.supplier_id,
          event_type: "send_failed",
          event_status: "failed",
          actor_id: actorId,
          provider: integration.provider,
          error_message: error,
          payload: responsePayload,
        });
      results.push({ supplierId: link.supplier_id, ok: false, error });
      continue;
    }
    const supplierUpdate = isReminder
      ? {
          last_reminded_at: now,
          provider_message_id: responsePayload.id,
          last_error: null,
          send_attempts: Number(link.send_attempts ?? 0) + 1,
        }
      : {
          delivery_status: "sent",
          response_status: "sent",
          sent_at: now,
          provider_message_id: responsePayload.id,
          last_error: null,
          send_attempts: Number(link.send_attempts ?? 0) + 1,
        };
    await admin
      .from("wpi_inquiry_suppliers")
      .update(supplierUpdate)
      .eq("inquiry_id", inquiry.data.id)
      .eq("supplier_id", link.supplier_id);
    await admin
      .from("wpi_inquiry_events")
      .insert({
        organization_id: organizationId,
        inquiry_id: inquiry.data.id,
        supplier_id: link.supplier_id,
        event_type: isReminder
          ? "reminded"
          : body.retry
            ? "retry_requested"
            : "sent",
        event_status: "completed",
        actor_id: actorId,
        provider: integration.provider,
        provider_message_id: responsePayload.id,
        payload: {
          recipient: contact.email,
          mode: isReminder ? "reminder" : "send",
          portalEnabled: Boolean(responseUrl),
        },
      });
    results.push({
      supplierId: link.supplier_id,
      ok: true,
      providerMessageId: responsePayload.id,
    });
  }
  const succeeded = results.filter((item) => item.ok).length;
  return json(
    {
      ok: succeeded > 0,
      succeeded,
      failed: results.length - succeeded,
      results,
    },
    succeeded ? 200 : 502,
  );
});
