import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { invalidateScopedRead, scopedReadResponse } from "../src/lib/data/scopedResponseCache.ts";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const scope = { organizationId: "org-a", userId: "user-a", role: "viewer" };

test("cache coalesces reads, keeps response bodies independently readable", async () => {
  let calls = 0;
  const load = async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 5)); return Response.json({ value: 42 }); };
  const responses = await Promise.all(Array.from({ length: 5 }, () => scopedReadResponse(scope, "same", load)));
  assert.equal(calls, 1);
  for (const response of responses) assert.deepEqual(await response.json(), { value: 42 });
  assert.deepEqual(await (await scopedReadResponse(scope, "same", load)).json(), { value: 42 });
  assert.equal(calls, 1);
});
test("cache isolates organization, user and role", async () => {
  let calls = 0;
  const load = async () => Response.json({ serial: ++calls });
  for (const isolated of [scope, { ...scope, organizationId: "org-b" }, { ...scope, userId: "user-b" }, { ...scope, role: "admin" }]) {
    await scopedReadResponse(isolated, "isolation", load);
  }
  assert.equal(calls, 4);
});
test("cache does not retain errors, cookies or expired results", async () => {
  for (const kind of ["error", "cookie", "expired"]) {
    let calls = 0;
    const load = async () => {
      calls++;
      return Response.json({ calls }, { status: kind === "error" ? 503 : 200, headers: kind === "cookie" ? { "set-cookie": "private=1" } : {} });
    };
    const ttl = kind === "expired" ? 0 : 30_000;
    await scopedReadResponse(scope, kind, load, ttl);
    await scopedReadResponse(scope, kind, load, ttl);
    assert.equal(calls, 2);
  }
});
test("cache clears rejected loads", async () => {
  await assert.rejects(scopedReadResponse(scope, "reject", async () => { throw new Error("offline"); }));
  assert.equal((await scopedReadResponse(scope, "reject", async () => Response.json({ ok: true }))).status, 200);
});
test("invalidating an in-flight request cannot delete its newer replacement", async () => {
  let reject;
  const old = scopedReadResponse(scope, "race", () => new Promise((_resolve, fail) => { reject = fail; }));
  await new Promise((resolve) => setImmediate(resolve));
  invalidateScopedRead(scope, "race");
  await scopedReadResponse(scope, "race", async () => Response.json({ version: 2 }));
  reject(new Error("old failed"));
  await assert.rejects(old);
  const fresh = await scopedReadResponse(scope, "race", async () => { throw new Error("must be cached"); });
  assert.deepEqual(await fresh.json(), { version: 2 });
});
test("operations authenticate before accessing a scoped cache", () => {
  const route = read("src/app/api/ai/operations/route.ts");
  assert.ok(route.indexOf("if (!access.ok)") < route.indexOf('scopedReadResponse(access, "ai-operations"'));
  assert.match(route, /wpi_get_ai_automation_matrix/);
  assert.match(route, /wpi_automation_incidents/);
});
test("AI workbench summaries omit payloads, review fetches full detail", () => {
  const api = read("src/app/api/ai/tasks/route.ts");
  const fields = api.split("const fields = summary")[1].split(': "*"')[0];
  assert.doesNotMatch(fields, /input_payload|output_payload/);
  assert.match(fields, /confidence,risk_level/);
  const page = read("src/app/ai-workbench/page.tsx");
  assert.match(page, /view=summary/);
  assert.match(page.split("const requestReview =")[1].split("const requestBatchReview")[0], /fetch\(`\/api\/ai\/tasks\?id=/);
});
test("quote progress cannot download items, evidence, or audit bodies", () => {
  const api = read("src/app/api/quote-recognition/route.ts");
  const progress = api.split('params.get("view") === "progress"')[1].split("let documentQuery")[0];
  assert.doesNotMatch(progress, /select\("\*"\)|wpi_quote_items|wpi_quote_item_evidence|wpi_audit_logs|output_payload/);
  assert.match(progress, /organization_id/);
  const page = read("src/components/quote-recognition/QuoteRecognitionWorkbench.tsx");
  assert.doesNotMatch(page, /setInterval/);
  assert.match(page, /view=progress&id=/);
  assert.match(page, /current\.data\.map/);
});
test("navigation has one background request owner", () => {
  const sidebar = read("src/components/layout/AppSidebar.tsx");
  const topbar = read("src/components/layout/AppTopbar.tsx");
  assert.doesNotMatch(sidebar, /fetch\(|setInterval/);
  assert.match(sidebar, /wpi:navigation-context/);
  assert.match(topbar, /wpi:navigation-context/);
  assert.match(topbar, /useVisiblePolling/);
});
test("report list projects JSON keys and no periodic whole-page refresh", () => {
  const api = read("src/app/api/reports/route.ts");
  assert.match(api, /project:content->>project,aiRiskLevel:content->>aiRiskLevel/);
  assert.match(api, /select\("report_type,project:content->>project"\)/);
  const page = read("src/app/ai-report-center/page.tsx");
  assert.doesNotMatch(page, /setInterval/);
  assert.match(page, /if \(changed.has\("wpi_reports"\)\) operations.push\(loadReports\(true\)\)/);
  assert.match(page, /\/api\/project-pricing\?view=names/);
});
test("analytics only reads the JSON keys required by existing period semantics", () => {
  const api = read("src/app/api/analytics/route.ts");
  assert.match(api, /analyticsMetadataProjection/);
  assert.match(api, /metadataDate\(row\)/);
  assert.match(api, /input_target_type:input_payload->targetType/);
  assert.doesNotMatch(api, /usd_price,metadata"|price,currency,metadata"/);
});
test("collector claims queued records and does not treat query errors as empty seeds", () => {
  const worker = read("supabase/functions/wpi-price-collector/index.ts");
  assert.match(worker, /if \(queuedResult.error\) throw/);
  assert.match(worker, /const discoveryWrite = queued.discoveryId/);
  assert.match(worker, /\.eq\("status", "queued"\)\s*\.select\("id"\).maybeSingle\(\)/);
  assert.match(worker, /registeredLinks.has\(linkHash\)/);
});
test("audit differences are lazy and details retain the permission check", () => {
  const route = read("src/app/api/settings/logs/route.ts");
  assert.ok(route.indexOf("await canReadAudit(access)") < route.indexOf("if (recordId)"));
  const list = route.split("let query = access.supabase")[1].split("if (validActions")[0];
  assert.doesNotMatch(list, /old_data|new_data/);
  assert.match(route, /scopedReadResponse\(access, "audit-summary"/);
  const page = read("src/app/settings/logs/page.tsx");
  assert.match(page, /onClick=\{\(\) => void openAuditDetail\(row\)\}/);
  assert.match(page, /\/api\/settings\/logs\?id=/);
});
