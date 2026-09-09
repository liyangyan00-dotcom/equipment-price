import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const writableRoles = new Set(["admin", "manager", "editor", "reviewer"]);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function portalPage(token: string) {
  const serializedToken = JSON.stringify(token).replaceAll("<", "\\u003c");
  const content = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>供应商报价门户</title>
  <style>
    :root{font-family:Arial,"Microsoft YaHei",sans-serif;color:#10233f;background:#f2f6fb}*{box-sizing:border-box}body{margin:0}main{width:min(1040px,calc(100% - 32px));margin:32px auto}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px}.brand{font-size:12px;color:#58708e}.title{margin:6px 0;font-size:24px}.status{padding:8px 12px;border-radius:6px;background:#e8f7ef;color:#16804c;font-size:12px;font-weight:700}.panel{background:#fff;border:1px solid #dbe5f0;border-radius:8px;padding:20px;margin-bottom:14px;box-shadow:0 6px 18px rgba(16,35,63,.06)}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.label{font-size:11px;color:#6b7f98}.value{margin-top:4px;font-size:14px;font-weight:700}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:860px}th,td{padding:10px 8px;border-bottom:1px solid #e6edf5;text-align:left;font-size:12px}th{background:#f7f9fc;color:#58708e}input,select,textarea{width:100%;border:1px solid #cfdbea;border-radius:5px;padding:8px;font:inherit;background:#fff}textarea{min-height:68px;resize:vertical}.contact{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.actions{display:flex;justify-content:flex-end;align-items:center;gap:12px}.message{font-size:12px;color:#58708e}.message.error{color:#c93838}.message.success{color:#16804c}button{border:0;border-radius:6px;background:#1264b5;color:#fff;padding:11px 18px;font-weight:700;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:720px){main{margin:18px auto}.header{display:block}.status{display:inline-block;margin-top:8px}.meta,.contact{grid-template-columns:1fr}.panel{padding:14px}}
  </style>
</head>
<body>
  <main>
    <header class="header"><div><div class="brand">水厂价格中枢 · AI Price Intelligence</div><h1 class="title">供应商报价门户</h1><div class="brand">请核对询价内容并填写全部报价项，提交后将进入采购方人工审核。</div></div><span id="portal-status" class="status">正在验证链接</span></header>
    <section class="panel"><div id="meta" class="meta"></div></section>
    <form id="quote-form">
      <section class="panel table-wrap"><table><thead><tr><th>询价项目</th><th>规格</th><th>数量</th><th>单价</th><th>币种</th><th>交期(天)</th><th>有效期(天)</th><th>技术/商务偏差</th></tr></thead><tbody id="items"></tbody></table></section>
      <section class="panel"><h2 style="font-size:16px;margin-top:0">联系人与说明</h2><div class="contact"><label><span class="label">联系人</span><input name="contactName" maxlength="120" /></label><label><span class="label">邮箱</span><input name="contactEmail" type="email" maxlength="200" /></label><label><span class="label">电话</span><input name="contactPhone" maxlength="80" /></label></div><label style="display:block;margin-top:12px"><span class="label">报价说明</span><textarea name="note" maxlength="4000"></textarea></label></section>
      <section class="actions"><span id="message" class="message">报价结果不会自动生效，采购方将进行人工复核。</span><button id="submit" type="submit" disabled>提交报价</button></section>
    </form>
  </main>
  <script>
    const token=${serializedToken};
    const endpoint=location.pathname.split('/quote-response/')[0];
    const form=document.querySelector('#quote-form');
    const submit=document.querySelector('#submit');
    const message=document.querySelector('#message');
    const statusNode=document.querySelector('#portal-status');
    const setMessage=(text,tone='')=>{message.textContent=text;message.className='message '+tone};
    const api=async(payload)=>{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,token})});const body=await response.json().catch(()=>({error:'INVALID_RESPONSE'}));if(!response.ok)throw new Error(body.error||'REQUEST_FAILED');return body.data};
    const render=async()=>{try{const data=await api({action:'load'});const inquiry=Array.isArray(data.inquiry)?data.inquiry[0]:data.inquiry;const supplier=Array.isArray(data.supplier)?data.supplier[0]:data.supplier;document.querySelector('#meta').innerHTML='';[['询价编号',inquiry?.inquiry_code],['询价主题',inquiry?.subject],['供应商',supplier?.name],['截止时间',inquiry?.deadline?new Date(inquiry.deadline).toLocaleString('zh-CN'):'未设置'],['基准币种',inquiry?.base_currency||'-'],['链接有效期',new Date(data.portal.expiresAt).toLocaleString('zh-CN')]].forEach(([label,value])=>{const box=document.createElement('div');const l=document.createElement('div');l.className='label';l.textContent=label;const v=document.createElement('div');v.className='value';v.textContent=value||'-';box.append(l,v);document.querySelector('#meta').append(box)});const quotes=new Map((data.quotes||[]).map(item=>[item.inquiry_item_id,item]));for(const item of data.items||[]){const quote=quotes.get(item.id)||{};const row=document.createElement('tr');row.dataset.id=item.id;const values=[item.item_name,item.specification||'-',String(item.quantity)+' '+item.unit];for(const value of values){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}row.insertAdjacentHTML('beforeend','<td><input data-field="unitPrice" type="number" min="0" step="0.01" required></td><td><select data-field="currency"><option>CDF</option><option>USD</option><option>EUR</option><option>CNY</option></select></td><td><input data-field="deliveryDays" type="number" min="0" step="1"></td><td><input data-field="validityDays" type="number" min="0" step="1"></td><td><textarea data-field="deviation" placeholder="无偏差可留空"></textarea></td>');row.querySelector('[data-field=unitPrice]').value=quote.unit_price??'';row.querySelector('[data-field=currency]').value=quote.currency||inquiry?.base_currency||'CDF';row.querySelector('[data-field=deliveryDays]').value=quote.delivery_days??'';row.querySelector('[data-field=validityDays]').value=quote.validity_days??'';row.querySelector('[data-field=deviation]').value=quote.commercial_deviation||quote.technical_deviation||'';document.querySelector('#items').append(row)}statusNode.textContent=data.portal.status==='submitted'?'已提交':'链接有效';submit.disabled=data.portal.status!=='active';if(data.portal.status==='submitted')setMessage('该报价已提交，如需修改请联系采购方。','success')}catch(error){statusNode.textContent='链接不可用';statusNode.style.background='#fdecec';statusNode.style.color='#c93838';setMessage('无法加载报价：'+error.message,'error')}};
    form.addEventListener('submit',async(event)=>{event.preventDefault();submit.disabled=true;setMessage('正在提交报价...');const items=[...document.querySelectorAll('#items tr')].map(row=>({inquiryItemId:row.dataset.id,unitPrice:Number(row.querySelector('[data-field=unitPrice]').value),currency:row.querySelector('[data-field=currency]').value,deliveryDays:row.querySelector('[data-field=deliveryDays]').value?Number(row.querySelector('[data-field=deliveryDays]').value):null,validityDays:row.querySelector('[data-field=validityDays]').value?Number(row.querySelector('[data-field=validityDays]').value):null,commercialDeviation:row.querySelector('[data-field=deviation]').value}));const values=new FormData(form);try{await api({action:'submit',items,contactName:values.get('contactName'),contactEmail:values.get('contactEmail'),contactPhone:values.get('contactPhone'),note:values.get('note')});statusNode.textContent='已提交';setMessage('报价提交成功，采购方将进行人工复核。','success')}catch(error){submit.disabled=false;setMessage('提交失败：'+error.message,'error')}});
    render();
  </script>
</body>
</html>`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    },
  });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method === "GET") {
    const pathname = new URL(request.url).pathname.replace(/\/$/, "");
    if (pathname.endsWith("/api/public/quote-response/health") || pathname.endsWith("/health")) {
      return json({ service: "wpi-supplier-quote-portal", public: true, version: 2 });
    }
    const match = pathname.match(/\/quote-response\/([^/]+)$/);
    if (match) return portalPage(decodeURIComponent(match[1]));
    return json({ service: "wpi-supplier-quote-portal", public: true, version: 2 });
  }
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const body = await request.json().catch(() => null) as {
    action?: "create" | "load" | "submit";
    inquiryId?: string;
    supplierId?: string;
    token?: string;
    expiresInDays?: number;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    note?: string;
    items?: Array<{
      inquiryItemId?: string;
      unitPrice?: number;
      currency?: string;
      deliveryDays?: number | null;
      validityDays?: number | null;
      technicalDeviation?: string;
      commercialDeviation?: string;
    }>;
  } | null;
  if (!body?.action) return json({ error: "ACTION_REQUIRED" }, 400);

  if (body.action === "create") {
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const userResult = await admin.auth.getUser(token);
    if (userResult.error || !userResult.data.user) return json({ error: "UNAUTHORIZED" }, 401);
    const membership = await admin.from("wpi_organization_members")
      .select("organization_id,role")
      .eq("user_id", userResult.data.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (membership.error || !membership.data || !writableRoles.has(membership.data.role)) {
      return json({ error: "PORTAL_LINK_CREATE_FORBIDDEN" }, 403);
    }
    if (!body.inquiryId || !body.supplierId) return json({ error: "INQUIRY_AND_SUPPLIER_REQUIRED" }, 400);
    const link = await admin.from("wpi_inquiry_suppliers")
      .select("inquiry_id,supplier_id")
      .eq("organization_id", membership.data.organization_id)
      .eq("inquiry_id", body.inquiryId)
      .eq("supplier_id", body.supplierId)
      .maybeSingle();
    if (link.error || !link.data) return json({ error: "INQUIRY_SUPPLIER_NOT_FOUND" }, 404);
    await admin.from("wpi_inquiry_portal_tokens")
      .update({ status: "revoked" })
      .eq("inquiry_id", body.inquiryId)
      .eq("supplier_id", body.supplierId)
      .eq("status", "active");
    const rawToken = randomToken();
    const expiresInDays = Math.min(30, Math.max(1, Number(body.expiresInDays ?? 14)));
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    const created = await admin.from("wpi_inquiry_portal_tokens").insert({
      organization_id: membership.data.organization_id,
      inquiry_id: body.inquiryId,
      supplier_id: body.supplierId,
      token_hash: await sha256(rawToken),
      expires_at: expiresAt,
      created_by: userResult.data.user.id,
    }).select("id").single();
    if (created.error) return json({ error: created.error.message }, 500);
    return json({ data: { token: rawToken, path: `/quote-response/${rawToken}`, expiresAt } }, 201);
  }

  const rawToken = String(body.token ?? "").trim();
  if (rawToken.length < 32) return json({ error: "INVALID_PORTAL_TOKEN" }, 401);
  const portal = await admin.from("wpi_inquiry_portal_tokens")
    .select("*,wpi_inquiries(id,inquiry_code,subject,deadline,status,base_currency,comparison_date),wpi_suppliers(id,name,region,review_status)")
    .eq("token_hash", await sha256(rawToken))
    .maybeSingle();
  if (portal.error || !portal.data) return json({ error: "PORTAL_TOKEN_NOT_FOUND" }, 404);
  if (portal.data.status === "revoked") return json({ error: "PORTAL_TOKEN_REVOKED" }, 410);
  if (new Date(portal.data.expires_at).getTime() <= Date.now()) {
    await admin.from("wpi_inquiry_portal_tokens").update({ status: "expired" }).eq("id", portal.data.id);
    return json({ error: "PORTAL_TOKEN_EXPIRED" }, 410);
  }
  const supplier = Array.isArray(portal.data.wpi_suppliers)
    ? portal.data.wpi_suppliers[0]
    : portal.data.wpi_suppliers;
  if (supplier?.review_status !== "approved") {
    await admin.from("wpi_inquiry_portal_tokens")
      .update({ status: "revoked" })
      .eq("id", portal.data.id);
    return json({ error: "SUPPLIER_NOT_APPROVED" }, 403);
  }

  const items = await admin.from("wpi_inquiry_items")
    .select("id,item_type,item_name,specification,quantity,unit,target_price,metadata")
    .eq("organization_id", portal.data.organization_id)
    .eq("inquiry_id", portal.data.inquiry_id)
    .order("created_at");
  if (items.error) return json({ error: items.error.message }, 500);
  const existing = await admin.from("wpi_inquiry_item_quotes")
    .select("*")
    .eq("inquiry_id", portal.data.inquiry_id)
    .eq("supplier_id", portal.data.supplier_id);
  if (existing.error) return json({ error: existing.error.message }, 500);

  if (body.action === "load") {
    if (!portal.data.opened_at) {
      const now = new Date().toISOString();
      await admin.from("wpi_inquiry_portal_tokens").update({
        opened_at: now,
        last_ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        last_user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
      }).eq("id", portal.data.id);
      await admin.from("wpi_inquiry_events").insert({
        organization_id: portal.data.organization_id,
        inquiry_id: portal.data.inquiry_id,
        supplier_id: portal.data.supplier_id,
        event_type: "portal_opened",
        event_status: "completed",
        payload: { portalTokenId: portal.data.id },
      });
    }
    return json({ data: { portal: { status: portal.data.status, expiresAt: portal.data.expires_at }, inquiry: portal.data.wpi_inquiries, supplier: portal.data.wpi_suppliers, items: items.data ?? [], quotes: existing.data ?? [] } });
  }

  if (body.action !== "submit") return json({ error: "ACTION_NOT_SUPPORTED" }, 400);
  if (portal.data.status !== "active") return json({ error: "PORTAL_ALREADY_SUBMITTED" }, 409);
  const sourceItems = new Map((items.data ?? []).map((item) => [item.id, item]));
  const submitted = body.items ?? [];
  if (!submitted.length || submitted.length !== sourceItems.size) return json({ error: "ALL_INQUIRY_ITEMS_REQUIRED" }, 400);
  const currencies = new Set(submitted.map((item) => String(item.currency ?? "").trim().toUpperCase()).filter(Boolean));
  if (currencies.size !== 1) return json({ error: "ONE_CURRENCY_PER_RESPONSE_REQUIRED" }, 400);
  const invalidItem = submitted.find((item) => {
    const source = sourceItems.get(String(item.inquiryItemId ?? ""));
    const unitPrice = Number(item.unitPrice);
    const deliveryDays = item.deliveryDays == null ? null : Number(item.deliveryDays);
    const validityDays = item.validityDays == null ? null : Number(item.validityDays);
    return !source || !Number.isFinite(unitPrice) || unitPrice < 0 ||
      (deliveryDays != null && (!Number.isInteger(deliveryDays) || deliveryDays < 0)) ||
      (validityDays != null && (!Number.isInteger(validityDays) || validityDays < 0));
  });
  if (invalidItem) return json({ error: "INVALID_ITEM_QUOTE" }, 400);
  const rows = submitted.map((item) => {
    const source = sourceItems.get(String(item.inquiryItemId ?? ""));
    const unitPrice = Number(item.unitPrice);
    if (!source) return null;
    return {
      organization_id: portal.data.organization_id,
      inquiry_id: portal.data.inquiry_id,
      inquiry_item_id: source.id,
      supplier_id: portal.data.supplier_id,
      quantity: source.quantity,
      unit: source.unit,
      unit_price: unitPrice,
      currency: [...currencies][0],
      delivery_days: item.deliveryDays == null ? null : Number(item.deliveryDays),
      validity_days: item.validityDays == null ? null : Number(item.validityDays),
      technical_deviation: String(item.technicalDeviation ?? "").trim().slice(0, 4000) || null,
      commercial_deviation: String(item.commercialDeviation ?? "").trim().slice(0, 4000) || null,
      metadata: { source: "supplier_portal", portalTokenId: portal.data.id },
    };
  }).filter(Boolean);
  const upsert = await admin.from("wpi_inquiry_item_quotes").upsert(rows, { onConflict: "inquiry_item_id,supplier_id" }).select("total_amount");
  if (upsert.error) return json({ error: upsert.error.message }, 500);
  const total = (upsert.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const now = new Date().toISOString();
  const response = await admin.from("wpi_inquiry_suppliers").update({
    quoted_amount: total,
    currency: [...currencies][0],
    responded_at: now,
    replied_at: now,
    response_status: "quoted",
    delivery_status: "replied",
    metadata: {
      source: "supplier_portal",
      portalTokenId: portal.data.id,
      contactName: String(body.contactName ?? "").trim().slice(0, 120) || null,
      contactEmail: String(body.contactEmail ?? "").trim().slice(0, 200) || null,
      contactPhone: String(body.contactPhone ?? "").trim().slice(0, 80) || null,
      supplierNote: String(body.note ?? "").trim().slice(0, 4000) || null,
    },
  }).eq("inquiry_id", portal.data.inquiry_id).eq("supplier_id", portal.data.supplier_id);
  if (response.error) return json({ error: response.error.message }, 500);
  await admin.from("wpi_inquiry_portal_tokens").update({ status: "submitted", submitted_at: now }).eq("id", portal.data.id);
  await admin.from("wpi_inquiry_events").insert({
    organization_id: portal.data.organization_id,
    inquiry_id: portal.data.inquiry_id,
    supplier_id: portal.data.supplier_id,
    event_type: "portal_submitted",
    event_status: "completed",
    payload: { portalTokenId: portal.data.id, itemCount: rows.length, total, currency: [...currencies][0] },
  });
  return json({ data: { submittedAt: now, itemCount: rows.length, total, currency: [...currencies][0] } }, 201);
});
