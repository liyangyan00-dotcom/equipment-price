import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCollectionPoller } from "../src/lib/priceCollection/polling.ts";

const settle = () => new Promise((resolve) => setImmediate(resolve));
function setup(load) {
  let visible = true;
  let next;
  let errors = 0;
  const calls = [];
  const poller = createCollectionPoller({
    load: async (full, signal) => { calls.push({ full, signal }); return load(full, signal); },
    visible: () => visible,
    onError: () => { errors++; },
    schedule: (callback, delay) => { next = { callback, delay }; return 1; },
    cancel: () => { next = undefined; },
  });
  return { poller, calls, get next() { return next; }, get errors() { return errors; },
    hide() { visible = false; poller.visibilityChanged(); },
    show() { visible = true; poller.visibilityChanged(); },
    async tick() { assert.ok(next); const callback = next.callback; next = undefined; callback(); await settle(); },
  };
}

test("idle initializes once and stops; explicit refresh still works", async () => {
  const s = setup(() => false);
  s.poller.start(); await settle();
  assert.equal(s.calls.length, 1); assert.equal(s.next, undefined);
  s.poller.refresh(); await settle();
  assert.equal(s.calls.length, 2); assert.equal(s.calls[1].full, true);
  s.poller.dispose();
});
test("active task uses summary after 30s, completion stops", async () => {
  let active = true;
  const s = setup(() => active);
  s.poller.start(); await settle();
  assert.equal(s.next.delay, 30000);
  active = false; await s.tick();
  assert.equal(s.calls[1].full, false); assert.equal(s.next, undefined);
});
test("slow requests never overlap and disposal aborts", async () => {
  let release;
  const s = setup(() => new Promise((resolve) => { release = resolve; }));
  s.poller.start(); s.poller.refresh(); s.poller.wake();
  assert.equal(s.calls.length, 1); assert.equal(s.next, undefined);
  s.poller.dispose(); assert.equal(s.calls[0].signal.aborted, true);
  release(true); await settle(); assert.equal(s.next, undefined);
});
test("hidden tabs pause, resume without full reload", async () => {
  const s = setup(() => true);
  s.poller.start(); await settle(); s.hide(); assert.equal(s.next, undefined);
  s.show(); await s.tick(); assert.equal(s.calls[1].full, false);
  s.poller.dispose();
});
test("aborted initialization is retried as initialization", async () => {
  let release;
  const s = setup(() => new Promise((resolve) => { release = resolve; }));
  s.poller.start(); s.hide(); release(false); await settle();
  s.show(); await s.tick(); assert.equal(s.calls[1].full, true);
  s.poller.dispose(); release(false); await settle();
});
test("failures back off, stop after five, manual refresh recovers", async () => {
  let failed = true;
  const s = setup(() => { if (failed) throw new Error("offline"); return false; });
  s.poller.start(); await settle();
  for (const delay of [60000, 120000, 240000, 300000]) {
    assert.equal(s.next.delay, delay); await s.tick();
  }
  assert.equal(s.errors, 5); assert.equal(s.next, undefined);
  s.poller.wake(); assert.equal(s.next, undefined);
  failed = false; s.poller.refresh(); await settle();
  assert.equal(s.calls.length, 6); assert.equal(s.next, undefined);
});
test("newly active task wakes an idle poller", async () => {
  const s = setup(() => false);
  s.poller.start(); await settle(); s.poller.wake(); await s.tick();
  assert.equal(s.calls[1].full, false);
});
test("authorization failure stops automatic requests immediately", async () => {
  for (const status of [401, 403]) {
    const s = setup(() => { throw Object.assign(new Error("denied"), { status }); });
    s.poller.start(); await settle();
    assert.equal(s.errors, 1); assert.equal(s.next, undefined);
    s.hide(); s.show(); assert.equal(s.next, undefined);
  }
});
test("new activity is not lost while an older request finishes", async () => {
  let release;
  const s = setup(() => new Promise((resolve) => { release = resolve; }));
  s.poller.start(); s.poller.wake(); release(false); await settle();
  assert.equal(s.next.delay, 30000);
  s.poller.dispose();
});
test("summary API is authorized, tenant scoped, bounded and projected", () => {
  const route = readFileSync(new URL("../src/app/api/price-collection/route.ts", import.meta.url), "utf8");
  const block = route.split('if (view === "equipment_progress")')[1].split('if (view === "schedule_policies")')[0];
  assert.ok(route.indexOf("const access = await getApiAccess()") < route.indexOf('if (view === "equipment_progress")'));
  assert.match(block, /ids.length > 100/);
  assert.match(block, /\.eq\("organization_id", access.organizationId\)/);
  assert.match(block, /\.eq\("target_type", "equipment"\)/);
  assert.match(block, /\.in\("id", ids\)/);
  assert.match(block, /\.limit\(100\)/);
  assert.doesNotMatch(block, /select\("\*"\)|wpi_price_collection_leads|wpi_price_collection_evidence/);
  const page = readFileSync(new URL("../src/components/equipment-catalog/EquipmentCatalogCollectionPage.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /setInterval/);
  assert.match(page, /equipment_progress&taskIds=/);
  assert.match(page, /if \(needsResultSync\)/);
});
