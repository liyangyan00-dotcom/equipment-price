import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type AdminClient = ReturnType<typeof createClient>;
type WebhookPayload = {
  type?: string;
  data?: Record<string, unknown> & {
    email_id?: string;
    id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    attachments?: Array<Record<string, unknown>>;
  };
};

const quoteMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

function base64Bytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifySvix(payload: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id") ?? "";
  const timestamp = headers.get("svix-timestamp") ?? "";
  const signatures = (headers.get("svix-signature") ?? "")
    .split(" ")
    .map((item) => item.split(",")[1])
    .filter(Boolean);
  const numericTimestamp = Number(timestamp);
  if (!id || !numericTimestamp || Math.abs(Date.now() / 1000 - numericTimestamp) > 300) return false;
  try {
    const keyValue = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = await crypto.subtle.importKey("raw", base64Bytes(keyValue), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`));
    const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return signatures.some((signature) => secureEqual(signature, expected));
  } catch {
    return false;
  }
}

function credentialParts(value: unknown) {
  const raw = String(value ?? "").trim();
  try {
    const parsed = JSON.parse(raw) as { apiKey?: string; webhookSecret?: string };
    return { apiKey: parsed.apiKey?.trim() ?? "", webhookSecret: parsed.webhookSecret?.trim() ?? "" };
  } catch {
    return { apiKey: raw, webhookSecret: "" };
  }
}

function emailAddress(value: unknown) {
  const match = String(value ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}

function safeName(value: unknown) {
  return String(value ?? "attachment")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .slice(0, 180);
}

function headerValue(headers: unknown, key: string) {
  if (!headers || typeof headers !== "object") return "";
  const record = headers as Record<string, unknown>;
  return String(record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()] ?? "");
}

async function loadRuntime(admin: AdminClient, organizationId: string) {
  const runtime = await admin.rpc("wpi_get_runtime_integration", {
    target_organization_id: organizationId,
    target_integration_code: "SMTP_OUTBOUND",
  });
  const data = runtime.data as { credential?: string; config?: Record<string, unknown> } | null;
  return { ...credentialParts(data?.credential), config: data?.config ?? {} };
}

async function recordOutboundEvent(
  admin: AdminClient,
  organizationId: string,
  parsed: WebhookPayload,
  messageId: string,
) {
  const link = await admin
    .from("wpi_inquiry_suppliers")
    .select("organization_id,inquiry_id,supplier_id")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  if (!link.data) return "ignored" as const;
  const eventMap: Record<string, { status: string; event: string; field?: string }> = {
    "email.sent": { status: "sent", event: "sent", field: "sent_at" },
    "email.delivered": { status: "delivered", event: "delivered", field: "delivered_at" },
    "email.opened": { status: "opened", event: "opened", field: "opened_at" },
    "email.bounced": { status: "bounced", event: "bounced" },
    "email.complained": { status: "bounced", event: "bounced" },
  };
  const mapping = eventMap[parsed.type ?? ""];
  if (!mapping) return "ignored" as const;
  const update: Record<string, unknown> = { delivery_status: mapping.status };
  if (mapping.field) update[mapping.field] = new Date().toISOString();
  if (mapping.status === "bounced") update.last_error = "邮件被服务商退回或投诉";
  await admin.from("wpi_inquiry_suppliers").update(update)
    .eq("inquiry_id", link.data.inquiry_id).eq("supplier_id", link.data.supplier_id);
  await admin.from("wpi_inquiry_events").insert({
    organization_id: organizationId,
    inquiry_id: link.data.inquiry_id,
    supplier_id: link.data.supplier_id,
    event_type: mapping.event,
    event_status: mapping.status === "bounced" ? "failed" : "completed",
    provider: "Resend",
    provider_message_id: messageId,
    payload: parsed,
  });
  return "completed" as const;
}

async function processInbound(
  admin: AdminClient,
  organizationId: string,
  runtime: { apiKey: string; config: Record<string, unknown> },
  parsed: WebhookPayload,
  providerEventId: string,
  messageId: string,
) {
  if (!runtime.apiKey) throw new Error("RESEND_API_KEY_MISSING");
  const receivedResponse = await fetch(`https://api.resend.com/emails/receiving/${messageId}`, {
    headers: { Authorization: `Bearer ${runtime.apiKey}` },
  });
  if (!receivedResponse.ok) throw new Error(`RESEND_RECEIVED_EMAIL_HTTP_${receivedResponse.status}`);
  const received = await receivedResponse.json() as Record<string, unknown>;
  const senderEmail = emailAddress(received.from ?? parsed.data?.from);
  const subject = String(received.subject ?? parsed.data?.subject ?? "").slice(0, 500);
  const recipients = Array.isArray(received.to) ? received.to.map(String) : (parsed.data?.to ?? []).map(String);
  const attachments = (Array.isArray(received.attachments) ? received.attachments : parsed.data?.attachments ?? []) as Array<Record<string, unknown>>;
  const inReplyTo = headerValue(received.headers, "in-reply-to");

  const contact = senderEmail
    ? await admin.from("wpi_supplier_contacts")
      .select("organization_id,supplier_id")
      .eq("organization_id", organizationId)
      .ilike("email", senderEmail)
      .limit(1)
      .maybeSingle()
    : { data: null, error: null };
  const supplierId = contact.data?.supplier_id ? String(contact.data.supplier_id) : null;
  let inquiryId: string | null = null;
  if (supplierId) {
    const links = await admin.from("wpi_inquiry_suppliers")
      .select("inquiry_id,provider_message_id,created_at,wpi_inquiries(inquiry_code,subject)")
      .eq("organization_id", organizationId)
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(30);
    const matched = (links.data ?? []).find((item) => {
      const inquiry = Array.isArray(item.wpi_inquiries) ? item.wpi_inquiries[0] : item.wpi_inquiries;
      return (inReplyTo && item.provider_message_id === inReplyTo.replace(/[<>]/g, ""))
        || (inquiry?.inquiry_code && subject.includes(String(inquiry.inquiry_code)));
    }) ?? links.data?.[0];
    inquiryId = matched?.inquiry_id ? String(matched.inquiry_id) : null;
  }

  const inboundInsert = await admin.from("wpi_inquiry_inbound_emails").insert({
    organization_id: organizationId,
    inquiry_id: inquiryId,
    supplier_id: supplierId,
    provider: "Resend",
    provider_message_id: messageId,
    provider_event_id: providerEventId,
    in_reply_to: inReplyTo || null,
    sender_email: senderEmail || "unknown@invalid.local",
    recipients,
    subject: subject || null,
    received_at: String(received.created_at ?? new Date().toISOString()),
    body_text: String(received.text ?? received.html ?? "").slice(0, 100000),
    attachment_count: attachments.length,
    processing_status: "processing",
    metadata: { headers: received.headers ?? {}, matchedBy: inquiryId ? "supplier_and_subject" : "unmatched" },
  }).select("id").single();
  if (inboundInsert.error) throw inboundInsert.error;

  const member = await admin.from("wpi_organization_members")
    .select("user_id,role")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("role")
    .limit(1)
    .maybeSingle();
  if (!member.data?.user_id) throw new Error("ORGANIZATION_ACTOR_MISSING");
  const actorId = String(member.data.user_id);
  const attachmentIds: string[] = [];
  let quoteDocumentId: string | null = null;

  for (const attachment of attachments) {
    const attachmentId = String(attachment.id ?? "");
    if (!attachmentId) continue;
    const detailResponse = await fetch(`https://api.resend.com/emails/receiving/${messageId}/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${runtime.apiKey}` },
    });
    if (!detailResponse.ok) continue;
    const detail = await detailResponse.json() as Record<string, unknown>;
    const downloadUrl = String(detail.download_url ?? "");
    if (!downloadUrl.startsWith("https://")) continue;
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) continue;
    const bytes = new Uint8Array(await fileResponse.arrayBuffer());
    if (!bytes.length || bytes.length > 50 * 1024 * 1024) continue;
    const fileName = safeName(detail.filename ?? attachment.filename ?? attachmentId);
    const mimeType = String(detail.content_type ?? attachment.content_type ?? fileResponse.headers.get("content-type") ?? "application/octet-stream").toLowerCase();
    const storagePath = `${organizationId}/inquiries/${inquiryId ?? "unmatched"}/inbound/${messageId}/${attachmentId}-${fileName}`;
    const upload = await admin.storage.from("business-documents").upload(storagePath, bytes, { contentType: mimeType, upsert: false });
    if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) continue;
    const evidence = await admin.from("wpi_attachments").upsert({
      organization_id: organizationId,
      bucket_id: "business-documents",
      object_path: storagePath,
      original_name: fileName,
      content_type: mimeType,
      size_bytes: bytes.length,
      related_type: "inquiry",
      related_id: inquiryId,
      evidence_type: quoteMimeTypes.has(mimeType) ? "quote_evidence" : "correspondence",
      verification_status: "pending",
      description: `供应商邮件回传：${subject || messageId}`,
      metadata: { provider: "Resend", inboundEmailId: inboundInsert.data.id, providerAttachmentId: attachmentId },
      uploaded_by: actorId,
    }, { onConflict: "bucket_id,object_path" }).select("id").single();
    if (evidence.data?.id) attachmentIds.push(String(evidence.data.id));

    if (!quoteDocumentId && quoteMimeTypes.has(mimeType)) {
      const quoteDocument = await admin.from("wpi_quote_documents").insert({
        organization_id: organizationId,
        file_name: fileName,
        file_size: bytes.length,
        mime_type: mimeType,
        storage_bucket: "business-documents",
        storage_path: storagePath,
        status: "uploaded",
        supplier_id: supplierId,
        supplier_name: senderEmail,
        source_metadata: { source: "inbound_email", inboundEmailId: inboundInsert.data.id, inquiryId, requiresHumanReview: true },
        created_by: actorId,
        updated_by: actorId,
      }).select("id").single();
      if (quoteDocument.data?.id) quoteDocumentId = String(quoteDocument.data.id);
    }
  }

  await admin.from("wpi_inquiry_inbound_emails").update({
    attachment_ids: attachmentIds,
    quote_document_id: quoteDocumentId,
    processing_status: "needs_review",
    error_message: inquiryId ? null : "未能自动匹配询价任务，请人工关联",
  }).eq("id", inboundInsert.data.id);
  if (inquiryId && supplierId) {
    await admin.from("wpi_inquiry_suppliers").update({
      delivery_status: "replied",
      response_status: quoteDocumentId ? "needs_review" : "responded",
      responded_at: new Date().toISOString(),
      last_error: null,
    }).eq("inquiry_id", inquiryId).eq("supplier_id", supplierId);
    const events: Array<Record<string, unknown>> = [{
      organization_id: organizationId,
      inquiry_id: inquiryId,
      supplier_id: supplierId,
      event_type: "inbound_email_received",
      event_status: "needs_review",
      provider: "Resend",
      provider_message_id: messageId,
      payload: { senderEmail, subject, inboundEmailId: inboundInsert.data.id },
    }];
    if (attachmentIds.length) events.push({
      organization_id: organizationId,
      inquiry_id: inquiryId,
      supplier_id: supplierId,
      event_type: "attachment_ingested",
      event_status: "needs_review",
      provider: "Resend",
      provider_message_id: messageId,
      payload: { attachmentIds, quoteDocumentId },
    });
    await admin.from("wpi_inquiry_events").insert(events);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawPayload = await request.text();
  let parsed: WebhookPayload;
  try {
    parsed = JSON.parse(rawPayload) as WebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const providerEventId = request.headers.get("svix-id") ?? "";
  const messageId = String(parsed.data?.email_id ?? parsed.data?.id ?? "");
  if (!providerEventId || !messageId) return new Response("Missing event id", { status: 400 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  let organizationId = "";
  let runtime = { apiKey: "", webhookSecret: "", config: {} as Record<string, unknown> };

  if (parsed.type === "email.received") {
    const integrations = await admin.from("wpi_integrations")
      .select("organization_id")
      .eq("integration_code", "SMTP_OUTBOUND")
      .eq("status", "active")
      .eq("credential_state", "configured");
    for (const integration of integrations.data ?? []) {
      const candidate = await loadRuntime(admin, String(integration.organization_id));
      if (candidate.webhookSecret && await verifySvix(rawPayload, request.headers, candidate.webhookSecret)) {
        organizationId = String(integration.organization_id);
        runtime = candidate;
        break;
      }
    }
  } else {
    const link = await admin.from("wpi_inquiry_suppliers")
      .select("organization_id")
      .eq("provider_message_id", messageId)
      .maybeSingle();
    if (link.data) {
      organizationId = String(link.data.organization_id);
      runtime = await loadRuntime(admin, organizationId);
      if (!runtime.webhookSecret || !(await verifySvix(rawPayload, request.headers, runtime.webhookSecret))) organizationId = "";
    }
  }
  if (!organizationId) return new Response("Invalid webhook", { status: 400 });

  const inbox = await admin.from("wpi_inquiry_webhook_events").insert({
    organization_id: organizationId,
    provider: "Resend",
    provider_event_id: providerEventId,
    event_type: parsed.type ?? "unknown",
    provider_message_id: messageId,
    processing_status: "processing",
    payload: parsed,
  }).select("id").single();
  if (inbox.error?.code === "23505") return new Response("Already processed", { status: 200 });
  if (inbox.error) return new Response(inbox.error.message, { status: 500 });
  const finish = async (status: "completed" | "ignored" | "failed", error?: string) => {
    await admin.from("wpi_inquiry_webhook_events").update({
      processing_status: status,
      error_message: error ?? null,
      processed_at: new Date().toISOString(),
    }).eq("id", inbox.data.id);
  };

  try {
    if (parsed.type === "email.received") {
      await processInbound(admin, organizationId, runtime, parsed, providerEventId, messageId);
      await finish("completed");
    } else {
      await finish(await recordOutboundEvent(admin, organizationId, parsed, messageId));
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finish("failed", message);
    return new Response(message, { status: 500 });
  }
});
